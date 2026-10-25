import { drumLaneOf } from './instruments';
import { ALIGN_SAMPLE_RATE, fft, frameCentre, frameCount, hann } from './dsp';
import type { AlignProgress } from './alignment';
import type { ChromaOnsets } from './chromaOnsets';
import type { BarMark, ScoreSong } from './types';

const HOP_SEC = 0.01;
const FFT_SIZE = 512;
const LOW_MAX_HZ = 150;
const MID_MAX_HZ = 2000;
const HIGH_MIN_HZ = 2500;
/** How far (in frames) a bar mark may move from the coarse alignment. */
const MAX_SHIFT = 60;
/** How far (in frames) the shift may change from one bar mark to the next. */
const MAX_SHIFT_STEP = 20;
/** Cost of a tempo change between neighbouring bars, per 100 % change (10 % costs 2, about two clear hits). */
const TEMPO_CHANGE_COST = 20;
const SHIFT_COST = 0.002;
const NORM_RADIUS = 200;
const NORM_BLOCK = 50;
/**
 * Flux peaks as soon as an attack is well inside the window, while the window
 * centre is still before it: each window is centred this much earlier so the
 * peak lands on the attack itself (measured on synthetic attacks).
 */
const WINDOW_LAG_SEC = 0.012;

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
  return onsetFeatures(samples).bands;
}

/** Band onsets plus the raw broadband spectral flux (one FFT pass for both). */
export function onsetFeatures(samples: Float32Array): {
  bands: OnsetBands;
  envelope: Float32Array;
} {
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
  const envelope = new Float32Array(frames);
  const lag = Math.round(WINDOW_LAG_SEC * ALIGN_SAMPLE_RATE);
  let last = new Float64Array(half);
  for (let f = 0; f < frames; f++) {
    const centre = frameCentre(f, HOP_SEC) - lag;
    for (let i = 0; i < FFT_SIZE; i++) {
      re[i] = (samples[centre + i - half] ?? 0) * win[i];
      im[i] = 0;
    }
    fft(re, im);
    const mag = new Float64Array(half);
    for (let k = 1; k < half; k++) {
      mag[k] = Math.log1p(100 * Math.sqrt(re[k] * re[k] + im[k] * im[k]));
      const rise = Math.max(0, mag[k] - last[k]);
      envelope[f] += rise;
      const band = bandOfBin[k];
      if (band >= 0) bands[band][f] += rise;
    }
    last = mag;
  }
  return {
    bands: [normalise(bands[0]), normalise(bands[1]), normalise(bands[2])],
    envelope,
  };
}

export interface NoteEvent {
  beat: number;
  weight: [number, number, number];
  /** Pitch classes struck (C = 0), weighted; their fifth counts as the third partial. */
  pcs: Float32Array;
}

/** Where each note's attack should show up: drums and bass in their bands, everything else as tones. */
export function noteEvents(song: ScoreSong): NoteEvent[] {
  const byBeat = new Map<number, { weight: [number, number, number]; pcs: Float32Array }>();
  const at = (beat: number) => {
    const key = Math.round(beat * 1000) / 1000;
    let ev = byBeat.get(key);
    if (!ev) {
      ev = { weight: [0, 0, 0], pcs: new Float32Array(12) };
      byBeat.set(key, ev);
    }
    return ev;
  };
  const tone = (beat: number, pitch: number) => {
    const ev = at(beat);
    ev.pcs[pitch % 12] += 1;
    ev.pcs[(pitch + 7) % 12] += 0.4;
  };
  for (const part of song.parts) {
    for (const n of part.notes) {
      if (part.isDrum) {
        const lane = drumLaneOf(n.pitch);
        if (lane === 4) at(n.t).weight[0] += 1;
        else at(n.t).weight[2] += lane === 0 || lane === 2 ? 1 : 0.3;
      } else if (part.guess === 'bass') {
        at(n.t).weight[0] += 0.7;
        tone(n.t, n.pitch);
      } else {
        at(n.t).weight[1] += 0.5;
        tone(n.t, n.pitch);
      }
    }
  }
  // Many parts striking together are stronger evidence, but not without limit.
  return [...byBeat.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([beat, ev]) => {
      let sum = 0;
      for (let c = 0; c < 12; c++) sum += ev.pcs[c];
      if (sum > 0) for (let c = 0; c < 12; c++) ev.pcs[c] /= sum;
      return {
        beat,
        weight: ev.weight.map((v) => Math.min(1.5, Math.sqrt(v))) as [number, number, number],
        pcs: ev.pcs,
      };
    });
}

export interface FitOptions {
  /** Pitch-specific onsets; with them a tone counts only where its own pitch classes start. */
  chroma?: ChromaOnsets;
  onProgress?: AlignProgress;
}

/**
 * Shifts every bar mark (up to ±0.6 s) so the score's attacks land on onsets in
 * the recording. The shifts are chosen jointly for the whole song (Viterbi over
 * pairs of neighbouring shifts), and a change of tempo from one bar to the next
 * costs: a band speeds up or slows down gradually, so a fit that makes one bar
 * 30 % faster and the next 30 % slower to catch an off-beat hit loses.
 */
export async function fitMarksToNotes(
  song: ScoreSong,
  marks: BarMark[],
  bands: OnsetBands,
  { chroma, onProgress }: FitOptions = {},
): Promise<BarMark[]> {
  const events = noteEvents(song);
  if (marks.length < 2 || !events.length) return marks;
  const peakAt = (env: Float32Array, k: number) =>
    Math.max(env[k - 1] ?? 0, env[k] ?? 0, env[k + 1] ?? 0);
  const evidence = (e: NoteEvent, sec: number) => {
    const k = Math.round(sec / HOP_SEC);
    let tonal = peakAt(bands[1], k);
    if (chroma) {
      let own = 0;
      for (let c = 0; c < 12; c++) if (e.pcs[c] > 0) own += e.pcs[c] * peakAt(chroma[c], k);
      // band flux still helps with muted or noisy strums, but a tone needs its own pitch
      tonal = 0.25 * tonal + 0.75 * own;
    }
    return (
      e.weight[0] * peakAt(bands[0], k) + e.weight[1] * tonal + e.weight[2] * peakAt(bands[2], k)
    );
  };
  const shifts = 2 * MAX_SHIFT + 1;
  const steps = 2 * MAX_SHIFT_STEP + 1;
  const shiftSec = (s: number) => (s - MAX_SHIFT) * HOP_SEC;
  const prior = (s: number) => SHIFT_COST * Math.abs(s - MAX_SHIFT);
  // state = (shift at the segment start a, shift at its end b), stored at a * steps + (b - a + MAX_SHIFT_STEP)
  const pairs = shifts * steps;
  const bOf = (p: number) => Math.floor(p / steps) + (p % steps) - MAX_SHIFT_STEP;
  const secPerBeat = new Float64Array(pairs);
  let score = new Float64Array(pairs);
  let lastSecPerBeat = new Float64Array(pairs);
  const back: Int32Array[] = [];
  let first = 0;
  for (let k = 0; k + 1 < marks.length; k++) {
    const from = marks[k];
    const to = marks[k + 1];
    while (first < events.length && events[first].beat < from.beat) first++;
    let end = first;
    while (end < events.length && events[end].beat < to.beat) end++;
    const next = new Float64Array(pairs).fill(-Infinity);
    const prev = new Int32Array(pairs).fill(-1);
    for (let a = 0; a < shifts; a++) {
      const fromSec = from.sec + shiftSec(a);
      for (let d = -MAX_SHIFT_STEP; d <= MAX_SHIFT_STEP; d++) {
        const b = a + d;
        const p = a * steps + d + MAX_SHIFT_STEP;
        const toSec = to.sec + shiftSec(b);
        if (b < 0 || b >= shifts || toSec - fromSec < 0.1) continue;
        let fit = 0;
        for (let i = first; i < end; i++) {
          const e = events[i];
          fit += evidence(
            e,
            fromSec + ((e.beat - from.beat) / (to.beat - from.beat)) * (toSec - fromSec),
          );
        }
        const spb = (toSec - fromSec) / (to.beat - from.beat);
        secPerBeat[p] = spb;
        if (k === 0) {
          next[p] = fit - prior(a) - prior(b);
          continue;
        }
        // the previous segment ended at shift a: its pairs are (c, a) for c within one step of a
        for (
          let c = Math.max(0, a - MAX_SHIFT_STEP);
          c <= Math.min(shifts - 1, a + MAX_SHIFT_STEP);
          c++
        ) {
          const q = c * steps + (a - c) + MAX_SHIFT_STEP;
          if (score[q] === -Infinity) continue;
          const total = score[q] - TEMPO_CHANGE_COST * Math.abs(spb / lastSecPerBeat[q] - 1);
          if (total > next[p]) {
            next[p] = total;
            prev[p] = q;
          }
        }
        next[p] += fit - prior(b);
      }
    }
    back.push(prev);
    score = next;
    lastSecPerBeat = secPerBeat.slice();
    if (onProgress && k % 10 === 0) await onProgress('refine', k / marks.length);
  }
  let best = 0;
  for (let p = 1; p < pairs; p++) if (score[p] > score[best]) best = p;
  if (score[best] === -Infinity) return marks;
  const chosen = new Int32Array(marks.length);
  for (let k = marks.length - 2; k >= 0; k--) {
    chosen[k + 1] = bOf(best);
    chosen[k] = Math.floor(best / steps);
    best = back[k][best];
  }
  // bars placed before the recording starts (an intro it does not have) stay where the warp put them
  return marks.map((m, k) => ({
    beat: m.beat,
    sec: m.sec < 0 ? m.sec : Math.max(0, m.sec + shiftSec(chosen[k])),
  }));
}
