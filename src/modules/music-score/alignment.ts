import { ALIGN_SAMPLE_RATE, fft, frameCentre, frameCount, hann } from './dsp';
import { fitMarksToNotes, onsetBands } from './noteFit';
import { onsetEnvelope, refineMarksWithOnsets } from './onsets';
import { beatToSec } from './timing';
import type { BarMark, ScoreSong } from './types';

const HOP_SEC = 0.1;
const CHROMA_FFT = 4096;
const SILENT_COST = 0.35;
/** Frames (±6 s) of the warp path fitted per bar: the DTW path of a dense mix jitters, a band's tempo does not. */
const FIT_RADIUS = 60;

export type AlignProgress = (
  stage: 'analyse' | 'match' | 'refine',
  fraction: number,
) => void | Promise<void>;

function normaliseRows(m: Float32Array, rows: number): Uint8Array {
  const empty = new Uint8Array(rows);
  for (let r = 0; r < rows; r++) {
    let norm = 0;
    for (let c = 0; c < 12; c++) norm += m[r * 12 + c] ** 2;
    if (norm === 0) empty[r] = 1;
    norm = Math.sqrt(norm) + 1e-9;
    for (let c = 0; c < 12; c++) m[r * 12 + c] /= norm;
  }
  return empty;
}

/** Pitch-class profile (chroma) of the recording, one row of 12 per 0.1 s. */
export async function audioChroma(samples: Float32Array, onProgress?: AlignProgress) {
  const sr = ALIGN_SAMPLE_RATE;
  // Frame f is centred on f * HOP_SEC so frame times line up with the score grid.
  const frames = frameCount(samples.length, HOP_SEC);
  const half = CHROMA_FFT / 2;
  const win = hann(CHROMA_FFT);
  const pcOfBin = new Int8Array(CHROMA_FFT / 2).fill(-1);
  for (let k = 1; k < CHROMA_FFT / 2; k++) {
    const f = (k * sr) / CHROMA_FFT;
    if (f > 60 && f < 2000)
      pcOfBin[k] = ((Math.round(69 + 12 * Math.log2(f / 440)) % 12) + 12) % 12;
  }
  const out = new Float32Array(frames * 12);
  const re = new Float64Array(CHROMA_FFT);
  const im = new Float64Array(CHROMA_FFT);
  for (let f = 0; f < frames; f++) {
    const centre = frameCentre(f, HOP_SEC);
    for (let i = 0; i < CHROMA_FFT; i++) {
      re[i] = (samples[centre + i - half] ?? 0) * win[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let k = 1; k < CHROMA_FFT / 2; k++) {
      const pc = pcOfBin[k];
      if (pc >= 0) out[f * 12 + pc] += Math.log1p(10 * Math.hypot(re[k], im[k]));
    }
    if (onProgress && f % 300 === 0) await onProgress('analyse', f / frames);
  }
  normaliseRows(out, frames);
  return { chroma: out, frames };
}

/** Pitch-class profile the score predicts, on the same 0.1 s grid. Drum parts are ignored. */
export function scoreChroma(song: ScoreSong) {
  const frames = Math.floor(beatToSec(song.tempoMap, song.end) / HOP_SEC) + 1;
  const out = new Float32Array(frames * 12);
  for (const part of song.parts) {
    if (part.isDrum) continue;
    for (const n of part.notes) {
      const a = Math.floor(beatToSec(song.tempoMap, n.t) / HOP_SEC);
      const b = Math.max(a + 1, Math.floor(beatToSec(song.tempoMap, n.t + n.dur) / HOP_SEC));
      for (let i = a; i < Math.min(frames, b); i++) out[i * 12 + (n.pitch % 12)] += 1;
    }
  }
  const silent = normaliseRows(out, frames);
  return { chroma: out, frames, silent };
}

/**
 * Dynamic time warping of score frames against recording frames with steps
 * (1,1), (1,2), (2,1): tempo may differ by up to a factor of two. The start in
 * the recording is free (intros, silence) and the end is chosen by mean cost.
 * Returns the recording time (s) of every score frame.
 */
export async function warpScoreToAudio(
  score: { chroma: Float32Array; frames: number; silent: Uint8Array },
  audio: { chroma: Float32Array; frames: number },
  onProgress?: AlignProgress,
): Promise<Float64Array> {
  const n = score.frames;
  const m = audio.frames;
  const INF = 1e30;
  const steps = new Int8Array(n * m);
  let prev2 = new Float64Array(m).fill(INF);
  let prev = new Float64Array(m);
  let cur = new Float64Array(m);
  const cost = (i: number, j: number) => {
    if (score.silent[i]) return SILENT_COST;
    let dot = 0;
    for (let c = 0; c < 12; c++) dot += score.chroma[i * 12 + c] * audio.chroma[j * 12 + c];
    return 1 - dot;
  };
  for (let j = 0; j < m; j++) prev[j] = cost(0, j);
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const diag = j >= 1 ? prev[j - 1] : INF;
      const fast = j >= 2 ? prev[j - 2] : INF;
      const slow = i >= 2 && j >= 1 ? prev2[j - 1] + cost(i - 1, j) : INF;
      let best = diag;
      let step = 0;
      if (fast < best) {
        best = fast;
        step = 1;
      }
      if (slow < best) {
        best = slow;
        step = 2;
      }
      cur[j] = best + cost(i, j);
      steps[i * m + j] = step;
    }
    [prev2, prev, cur] = [prev, cur, prev2];
    if (onProgress && i % 200 === 0) await onProgress('match', i / n);
  }
  let j = 0;
  let bestEnd = INF;
  for (let k = 0; k < m; k++) {
    const v = prev[k] / (n + k + 1);
    if (v < bestEnd) {
      bestEnd = v;
      j = k;
    }
  }
  const at = new Float64Array(n);
  let i = n - 1;
  at[i] = j * HOP_SEC;
  while (i > 0) {
    const step = steps[i * m + j];
    if (step === 0) {
      i--;
      j--;
    } else if (step === 1) {
      i--;
      j -= 2;
    } else {
      at[i - 1] = (j - 1) * HOP_SEC;
      i -= 2;
      j--;
    }
    if (i >= 0) at[i] = Math.max(0, j) * HOP_SEC;
  }
  return at;
}

/** Turns the frame warp into one mark per bar (median-smoothed, strictly increasing) plus one at the end. */
export function marksFromWarp(song: ScoreSong, audioAt: Float64Array): BarMark[] {
  const n = audioAt.length;
  // Local straight-line fit of the warp path around each bar start: robust against
  // single-frame jumps and unbiased when the tempo drifts.
  const marks = song.measureStarts.map((beat) => {
    const k = Math.min(n - 1, Math.round(beatToSec(song.tempoMap, beat) / HOP_SEC));
    const lo = Math.max(0, k - FIT_RADIUS);
    const hi = Math.min(n - 1, k + FIT_RADIUS);
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let sxy = 0;
    const cnt = hi - lo + 1;
    for (let i = lo; i <= hi; i++) {
      sx += i;
      sy += audioAt[i];
      sxx += i * i;
      sxy += i * audioAt[i];
    }
    const den = cnt * sxx - sx * sx;
    const slope = den > 0 ? (cnt * sxy - sx * sy) / den : 0;
    const sec =
      (sy - slope * sx) / cnt +
      slope * k +
      // slope is seconds per frame, so the offset into frame k is scaled to frames first
      ((beatToSec(song.tempoMap, beat) - k * HOP_SEC) / HOP_SEC) * slope;
    return { beat, sec };
  });
  for (let k = 1; k < marks.length; k++) {
    if (marks[k].sec <= marks[k - 1].sec + 0.05) marks[k].sec = marks[k - 1].sec + 0.05;
  }
  const tm = song.tempoMap;
  const last = marks[marks.length - 1];
  const prev = marks[marks.length - 2];
  const scoreSpan = prev ? beatToSec(tm, last.beat) - beatToSec(tm, prev.beat) : 0;
  const factor = prev && scoreSpan > 0 ? (last.sec - prev.sec) / scoreSpan : 1;
  marks.push({
    beat: song.end,
    sec: last.sec + (beatToSec(tm, song.end) - beatToSec(tm, last.beat)) * factor,
  });
  return marks;
}

/** Full alignment of a mono recording (at ALIGN_SAMPLE_RATE) to the score: one mark per bar. */
export async function alignRecording(
  song: ScoreSong,
  samples: Float32Array,
  onProgress?: AlignProgress,
): Promise<BarMark[]> {
  const audio = await audioChroma(samples, onProgress);
  const warp = await warpScoreToAudio(scoreChroma(song), audio, onProgress);
  const coarse = marksFromWarp(song, warp);
  if (onProgress) await onProgress('refine', 0);
  const onsets = onsetEnvelope(samples);
  const started = refineMarksWithOnsets(coarse.slice(0, 1), onsets).concat(coarse.slice(1));
  return fitMarksToNotes(song, started, onsetBands(samples), onProgress);
}
