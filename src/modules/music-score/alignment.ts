import {
  HOP_SEC,
  audioChroma,
  audioOnsetRows,
  decimate,
  frameCost,
  scoreFeatures,
  transpose,
  type Features,
} from './alignFeatures';
import { chromaOnsets, type ChromaOnsets } from './chromaOnsets';
import { fitMarksToNotes, onsetFeatures } from './noteFit';
import { refineMarksWithOnsets } from './onsets';
import { beatToSec } from './timing';
import { estimateTuningCents } from './tuning';
import type { BarMark, ScoreSong } from './types';

/** Frames (±6 s) of the warp path fitted per bar: the DTW path of a dense mix jitters, a band's tempo does not. */
const FIT_RADIUS = 60;
/** Extra cost of a tempo-changing step: recordings mostly keep a steady tempo, a weakly matching mix should not wander. */
const STEP_PENALTY = 0.2;
/** Semitone shifts of the score tried against the recording (a band tuned down, a capo, a transposed arrangement). */
const SHIFTS = [0, -1, 1, -2, 2];
/** A shift must beat the untransposed score by this much mean cost to be taken. */
const SHIFT_MARGIN = 0.01;
/** Frames averaged when comparing shifts on a coarser grid. */
const COARSE = 5;

export type AlignProgress = (
  stage: 'analyse' | 'match' | 'refine',
  fraction: number,
) => void | Promise<void>;

export interface AlignResult {
  marks: BarMark[];
  /** Detuning of the recording from A = 440 Hz (cents) and whole semitones the score was shifted by to match it. */
  tuning: { cents: number; semitones: number };
}

/**
 * Dynamic time warping of n score frames against m recording frames with steps
 * (1,1), (1,2), (2,1): tempo may differ by up to a factor of two. The start in
 * the recording is free (intros, silence) and the end is chosen by mean cost.
 * Returns the recording frame of every score frame and the mean cost along the path.
 */
export async function warpScoreToAudio(
  n: number,
  m: number,
  cost: (i: number, j: number) => number,
  onProgress?: AlignProgress,
): Promise<{ at: Float64Array; meanCost: number }> {
  const INF = 1e30;
  const steps = new Int8Array(n * m);
  let prev2 = new Float64Array(m).fill(INF);
  let prev = new Float64Array(m);
  let cur = new Float64Array(m);
  // recording frame each path starts at, so the end can be chosen by the path's own mean cost
  let from2 = new Int32Array(m);
  let from = Int32Array.from({ length: m }, (_, j) => j);
  let fromCur = new Int32Array(m);
  for (let j = 0; j < m; j++) prev[j] = cost(0, j);
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const diag = j >= 1 ? prev[j - 1] : INF;
      const fast = j >= 2 ? prev[j - 2] + STEP_PENALTY : INF;
      const slow = i >= 2 && j >= 1 ? prev2[j - 1] + cost(i - 1, j) + STEP_PENALTY : INF;
      let best = diag;
      let step = 0;
      let start = j >= 1 ? from[j - 1] : 0;
      if (fast < best) {
        best = fast;
        step = 1;
        start = from[j - 2];
      }
      if (slow < best) {
        best = slow;
        step = 2;
        start = from2[j - 1];
      }
      cur[j] = best + cost(i, j);
      fromCur[j] = start;
      steps[i * m + j] = step;
    }
    [prev2, prev, cur] = [prev, cur, prev2];
    [from2, from, fromCur] = [from, fromCur, from2];
    if (onProgress && i % 200 === 0) await onProgress('match', i / n);
  }
  let j = 0;
  let bestEnd = INF;
  for (let k = 0; k < m; k++) {
    // a path covers about n + (its recording span) cells
    const v = prev[k] / (n + k - from[k] + 1);
    if (v < bestEnd) {
      bestEnd = v;
      j = k;
    }
  }
  const at = new Float64Array(n);
  let i = n - 1;
  at[i] = j;
  let sum = cost(i, j);
  let cells = 1;
  while (i > 0) {
    const step = steps[i * m + j];
    if (step === 0) {
      i--;
      j--;
    } else if (step === 1) {
      i--;
      j -= 2;
    } else {
      at[i - 1] = j - 1;
      sum += cost(i - 1, j - 1);
      cells++;
      i -= 2;
      j--;
    }
    j = Math.max(0, j);
    if (i >= 0) {
      at[i] = j;
      sum += cost(i, j);
      cells++;
    }
  }
  return { at, meanCost: sum / cells };
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

/** Shift of the score (in semitones) whose warp through the recording is cheapest, on a coarse grid. */
async function bestShift(score: ReturnType<typeof scoreFeatures>, audio: Features) {
  const a = decimate(audio, COARSE);
  let best = { semitones: 0, cost: Infinity };
  for (const s of SHIFTS) {
    const sc = decimate(transpose(score, s), COARSE);
    const { meanCost } = await warpScoreToAudio(sc.frames, a.frames, frameCost(sc, a));
    const cost = s === 0 ? meanCost - SHIFT_MARGIN : meanCost;
    if (cost < best.cost) best = { semitones: s, cost };
  }
  return best.semitones;
}

/** Full alignment of a mono recording (at ALIGN_SAMPLE_RATE) to the score: one mark per bar. */
export async function alignRecording(
  song: ScoreSong,
  samples: Float32Array,
  onProgress?: AlignProgress,
): Promise<AlignResult> {
  const cents = estimateTuningCents(samples);
  const { chroma, frames } = await audioChroma(samples, onProgress, cents);
  const { bands, envelope } = onsetFeatures(samples);
  const pitched = chromaOnsets(samples, cents);
  const audio: Features = { chroma, frames, onsets: audioOnsetRows(pitched, bands, frames) };
  const plain = scoreFeatures(song);
  const semitones = await bestShift(plain, audio);
  const score = transpose(plain, semitones);
  const warp = await warpScoreToAudio(
    score.frames,
    audio.frames,
    frameCost(score, audio),
    onProgress,
  );
  const coarse = marksFromWarp(
    song,
    warp.at.map((f) => f * HOP_SEC),
  );
  if (onProgress) await onProgress('refine', 0);
  const started = refineMarksWithOnsets(coarse.slice(0, 1), envelope).concat(coarse.slice(1));
  // the fit compares score pitch classes with the recording's, so it sees them shifted too
  const shifted = semitones ? rotate(pitched, -semitones) : pitched;
  const marks = await fitMarksToNotes(song, started, bands, { chroma: shifted, onProgress });
  return { marks, tuning: { cents: Math.round(cents), semitones } };
}

/** Pitch-class envelopes relabelled so class c holds what was class c - semitones. */
function rotate(chroma: ChromaOnsets, semitones: number): ChromaOnsets {
  return chroma.map((_, c) => chroma[(((c - semitones) % 12) + 12) % 12]);
}
