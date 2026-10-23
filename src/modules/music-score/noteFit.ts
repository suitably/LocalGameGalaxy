import { drumLaneOf } from './instruments';
import { ALIGN_SAMPLE_RATE, fft, frameCentre, frameCount, hann } from './dsp';
import type { AlignProgress } from './alignment';
import type { BarMark, ScoreSong } from './types';

const HOP_SEC = 0.01;
const FFT_SIZE = 512;
const LOW_MAX_HZ = 150;
const MID_MAX_HZ = 2000;
const HIGH_MIN_HZ = 2500;
/** How far (in frames) a bar mark may move from the coarse alignment. */
const MAX_SHIFT = 40;
/** How far (in frames) the shift may change from one bar mark to the next. */
const MAX_SHIFT_STEP = 20;
const SHIFT_STEP_COST = 0.1;
const SHIFT_COST = 0.002;
const NORM_RADIUS = 200;
const NORM_BLOCK = 50;

export type Band = 0 | 1 | 2;

/** Spectral-flux onset strength per 10 ms in three bands: low (kick, bass), mid (tones), high (snare, cymbals). */
export type OnsetBands = [Float32Array, Float32Array, Float32Array];

/** Scales an envelope so its local median is 0 and its local 98th percentile is 1 (quiet passages count as much as loud ones). */
function normalise(env: Float32Array): Float32Array {
  const out = new Float32Array(env.length);
  for (let i = 0; i < env.length; i += NORM_BLOCK) {
    const near = Array.from(
      env.subarray(Math.max(0, i - NORM_RADIUS), Math.min(env.length, i + NORM_RADIUS)),
    ).sort((a, b) => a - b);
    const median = near[near.length >> 1];
    const top = near[Math.floor(near.length * 0.98)];
    for (let j = i; j < Math.min(env.length, i + NORM_BLOCK); j++)
      out[j] = Math.max(0, (env[j] - median) / (top - median + 1e-9));
  }
  return out;
}

export function onsetBands(samples: Float32Array): OnsetBands {
  const frames = frameCount(samples.length, HOP_SEC);
  const half = FFT_SIZE / 2;
  const win = hann(FFT_SIZE);
  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);
  const bandOfBin = new Int8Array(half).map((_, k) => {
    const hz = (k * ALIGN_SAMPLE_RATE) / FFT_SIZE;
    return hz < LOW_MAX_HZ ? 0 : hz < MID_MAX_HZ ? 1 : hz > HIGH_MIN_HZ ? 2 : -1;
  });
  const bands: OnsetBands = [
    new Float32Array(frames),
    new Float32Array(frames),
    new Float32Array(frames),
  ];
  let last = new Float64Array(half);
  for (let f = 0; f < frames; f++) {
    const centre = frameCentre(f, HOP_SEC);
    for (let i = 0; i < FFT_SIZE; i++) {
      re[i] = (samples[centre + i - half] ?? 0) * win[i];
      im[i] = 0;
    }
    fft(re, im);
    const mag = new Float64Array(half);
    for (let k = 1; k < half; k++) {
      mag[k] = Math.log1p(100 * Math.hypot(re[k], im[k]));
      const band = bandOfBin[k];
      if (band >= 0) bands[band][f] += Math.max(0, mag[k] - last[k]);
    }
    last = mag;
  }
  return [normalise(bands[0]), normalise(bands[1]), normalise(bands[2])];
}

interface NoteEvent {
  beat: number;
  weight: [number, number, number];
}

/** Where each note's attack should show up: drums and bass in their bands, everything else as tones. */
function noteEvents(song: ScoreSong): NoteEvent[] {
  const byBeat = new Map<number, [number, number, number]>();
  const add = (beat: number, band: Band, w: number) => {
    const key = Math.round(beat * 1000) / 1000;
    const weight = byBeat.get(key) ?? [0, 0, 0];
    weight[band] += w;
    byBeat.set(key, weight);
  };
  for (const part of song.parts) {
    for (const n of part.notes) {
      if (part.isDrum) {
        const lane = drumLaneOf(n.pitch);
        if (lane === 4) add(n.t, 0, 1);
        else add(n.t, 2, lane === 0 || lane === 2 ? 1 : 0.3);
      } else if (part.guess === 'bass') add(n.t, 0, 0.7);
      else add(n.t, 1, 0.5);
    }
  }
  // Many parts striking together are stronger evidence, but not without limit.
  return [...byBeat.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([beat, w]) => ({
      beat,
      weight: w.map((v) => Math.min(1.5, Math.sqrt(v))) as [number, number, number],
    }));
}

/**
 * Shifts every bar mark (up to ±0.4 s) so the score's attacks land on onsets in
 * the recording. One shift per mark, chosen jointly for the whole song (Viterbi),
 * so the tempo between neighbouring marks only changes smoothly.
 */
export async function fitMarksToNotes(
  song: ScoreSong,
  marks: BarMark[],
  bands: OnsetBands,
  onProgress?: AlignProgress,
): Promise<BarMark[]> {
  const events = noteEvents(song);
  if (marks.length < 2 || !events.length) return marks;
  const strength = (band: Band, sec: number) => {
    const k = Math.round(sec / HOP_SEC);
    const env = bands[band];
    return Math.max(env[k - 1] ?? 0, env[k] ?? 0, env[k + 1] ?? 0);
  };
  const states = 2 * MAX_SHIFT + 1;
  const shiftSec = (s: number) => (s - MAX_SHIFT) * HOP_SEC;
  let score = new Float64Array(states).map((_, s) => -SHIFT_COST * Math.abs(s - MAX_SHIFT));
  const back: Int16Array[] = [];
  let first = 0;
  for (let k = 0; k + 1 < marks.length; k++) {
    const from = marks[k];
    const to = marks[k + 1];
    while (first < events.length && events[first].beat < from.beat) first++;
    let end = first;
    while (end < events.length && events[end].beat < to.beat) end++;
    const next = new Float64Array(states).fill(-Infinity);
    const prev = new Int16Array(states);
    for (let b = 0; b < states; b++) {
      const toSec = to.sec + shiftSec(b);
      for (
        let a = Math.max(0, b - MAX_SHIFT_STEP);
        a <= Math.min(states - 1, b + MAX_SHIFT_STEP);
        a++
      ) {
        const fromSec = from.sec + shiftSec(a);
        if (toSec - fromSec < 0.1 || score[a] === -Infinity) continue;
        let fit = 0;
        for (let i = first; i < end; i++) {
          const e = events[i];
          const sec = fromSec + ((e.beat - from.beat) / (to.beat - from.beat)) * (toSec - fromSec);
          fit +=
            e.weight[0] * strength(0, sec) +
            e.weight[1] * strength(1, sec) +
            e.weight[2] * strength(2, sec);
        }
        const total =
          score[a] + fit - SHIFT_STEP_COST * Math.abs(b - a) - SHIFT_COST * Math.abs(b - MAX_SHIFT);
        if (total > next[b]) {
          next[b] = total;
          prev[b] = a;
        }
      }
    }
    back.push(prev);
    score = next;
    if (onProgress && k % 10 === 0) await onProgress('refine', k / marks.length);
  }
  let best = 0;
  for (let s = 1; s < states; s++) if (score[s] > score[best]) best = s;
  const out = marks.map((m) => ({ ...m }));
  for (let k = marks.length - 1; k >= 0; k--) {
    out[k].sec = Math.max(0, marks[k].sec + shiftSec(best));
    if (k > 0) best = back[k - 1][best];
  }
  return out;
}
