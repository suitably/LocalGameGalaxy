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
import { hasPitchedNotes, marksFromOnsets } from './onsetAlign';
import { beatToSec } from './timing';
import { unrelatedCost, warpScoreToAudio } from './warp';
import { estimateTuningCents } from './tuning';
import type { BarMark, ScoreSong } from './types';

/** Frames (±6 s) of the warp path fitted per bar: the DTW path of a dense mix jitters, a band's tempo does not. */
const FIT_RADIUS = 60;
/** Semitone shifts of the score tried against the recording (a band tuned down, a capo, a transposed arrangement). */
const SHIFTS = [0, -1, 1, -2, 2];
/** A shift must beat the untransposed score by this much mean cost to be taken. */
const SHIFT_MARGIN = 0.01;
/** Frames averaged when comparing shifts on a coarser grid. */
const COARSE = 5;
/** Score time that may stay unmatched at either end: an arrangement's intro or outro the recording does not have. */
const MAX_SKIP_SEC = 30;
/**
 * Cost of a skipped frame as a share of what an unrelated pairing of score and
 * recording frames costs (measured per song): above it, so only score unlike the
 * recording is left out. Lower values let a chord loop that repeats every two bars
 * match shifted by those bars more cheaply than at its true place (a brass
 * arrangement of "Rose Tattoo" moved two bars at 0.89).
 */
const SKIP_SHARE = 1.1;
/** A jump or standstill of the warp at least this long splits the per-bar fit (s). */
const GAP_MIN_SEC = 1.5;
/**
 * Gaps in the middle (see warpScoreToAudio), in units of an unrelated pairing's cost. Opening
 * one costs GAP_OPEN. Each recording frame left out costs GAP_EXTEND_RECORDING: the score still
 * pays for every one of its own frames, so a cheap one cannot hollow the match out. Each score
 * frame left out costs SKIP_SHARE, more than matching it however badly, or the score would
 * rather collapse than be matched.
 */
const GAP_OPEN = 3;
const GAP_EXTEND_RECORDING = 0.1;
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
 * Splits the warp (recording seconds per score frame) at gaps: where the recording jumps ahead
 * (frames the score lacks) or stands still (score frames the recording lacks) for at least
 * GAP_MIN_SEC. Per score frame, the first and last frame of its piece.
 */
export function warpSegments(at: Float64Array): { start: Int32Array; end: Int32Array } {
  const n = at.length;
  const start = new Int32Array(n);
  const end = new Int32Array(n);
  const minRun = Math.ceil(GAP_MIN_SEC / HOP_SEC);
  // score frames that stand still on one recording moment for long: each is a piece of its own
  const still = new Uint8Array(n);
  for (let i = 0; i < n;) {
    let k = i + 1;
    while (k < n && at[k] === at[i]) k++;
    if (k - i >= minRun) still.fill(1, i, k);
    i = k;
  }
  let first = 0;
  for (let i = 0; i < n; i++) {
    if (still[i]) {
      start[i] = i;
      end[i] = i;
      first = i + 1;
      continue;
    }
    const last = i + 1 >= n || still[i + 1] || at[i + 1] - at[i] >= GAP_MIN_SEC;
    if (!last) continue;
    for (let k = first; k <= i; k++) {
      start[k] = first;
      end[k] = i;
    }
    first = i + 1;
  }
  return { start, end };
}

/** Turns the frame warp into one mark per bar (median-smoothed, strictly increasing) plus one at the end. */
export function marksFromWarp(song: ScoreSong, audioAt: Float64Array): BarMark[] {
  const n = audioAt.length;
  // Local straight-line fit of the warp path around each bar start: robust against
  // single-frame jumps and unbiased when the tempo drifts.
  const segment = warpSegments(audioAt);
  const marks = song.measureStarts.map((beat) => {
    const k = Math.min(n - 1, Math.round(beatToSec(song.tempoMap, beat) / HOP_SEC));
    // the fit stays on its side of a gap: a jump in the recording is no tempo change
    const lo = Math.max(segment.start[k], k - FIT_RADIUS);
    const hi = Math.min(segment.end[k], k + FIT_RADIUS);
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

/** Shift of the score (in semitones) whose warp through the recording is cheapest, on a coarse grid, and that warp's mean cost. */
async function bestShift(score: ReturnType<typeof scoreFeatures>, audio: Features) {
  const a = decimate(audio, COARSE);
  let best = { semitones: 0, cost: Infinity, meanCost: 0 };
  for (const s of SHIFTS) {
    const sc = decimate(transpose(score, s), COARSE);
    const { meanCost } = await warpScoreToAudio(sc.frames, a.frames, frameCost(sc, a));
    const cost = s === 0 ? meanCost - SHIFT_MARGIN : meanCost;
    if (cost < best.cost) best = { semitones: s, cost, meanCost };
  }
  return best;
}

/** Full alignment of a mono recording (at ALIGN_SAMPLE_RATE) to the score: one mark per bar. */
export async function alignRecording(
  song: ScoreSong,
  samples: Float32Array,
  onProgress?: AlignProgress,
): Promise<AlignResult> {
  const cents = estimateTuningCents(samples);
  const { bands, envelope } = onsetFeatures(samples);
  if (!hasPitchedNotes(song)) {
    // no pitches to follow (drums only): coarse marks from the attacks alone
    const coarse = await marksFromOnsets(song, bands, onProgress);
    if (onProgress) await onProgress('refine', 0);
    const marks = await fitMarksToNotes(song, coarse, bands, { onProgress });
    return { marks, tuning: { cents: Math.round(cents), semitones: 0 } };
  }
  const { chroma, frames } = await audioChroma(samples, onProgress, cents);
  const pitched = chromaOnsets(samples, cents);
  const audio: Features = { chroma, frames, onsets: audioOnsetRows(pitched, bands, frames) };
  const plain = scoreFeatures(song);
  const { semitones } = await bestShift(plain, audio);
  const score = transpose(plain, semitones);
  const cost = frameCost(score, audio);
  const baseline = unrelatedCost(score.frames, audio.frames, cost);
  const warp = await warpScoreToAudio(score.frames, audio.frames, cost, onProgress, {
    maxSkip: Math.round(MAX_SKIP_SEC / HOP_SEC),
    skipCost: SKIP_SHARE * baseline,
    gap: {
      open: GAP_OPEN * baseline,
      extendRecording: GAP_EXTEND_RECORDING * baseline,
      extendScore: SKIP_SHARE * baseline,
    },
  });
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
