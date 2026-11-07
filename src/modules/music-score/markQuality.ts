import { beatToSec } from './timing';
import type { BarMark, ScoreSong } from './types';

/**
 * Checks and simplifies bar marks without the recording: most studio and click recordings
 * keep one tempo, so a straight line through the marks is a strong reference. Bars whose
 * own tempo leaves the song's tempo, or marks far off that line in a steady song, are
 * where an alignment usually went wrong (a chord loop matched a few bars off, an intro
 * squeezed, the last bar stretched into a fade-out).
 */

/** Version of the alignment that produced stored marks; marks from an older one are aligned again. */
export const ALIGN_VERSION = 2;

/** A bar this much faster or slower than the song's median tempo is suspect. */
const BAR_TEMPO_TOLERANCE = 0.12;
/** A song counts as steady when this share of its bars lies within STEADY_SEC of the straight line. */
const STEADY_SHARE = 0.9;
const STEADY_SEC = 0.08;
/** In a steady song, a mark this far off the line is suspect. */
const OFF_LINE_SEC = 0.25;
/** Recording tempo against the written one beyond this ratio (either way) is implausible. */
const MAX_TEMPO_RATIO = 1.3;

export interface SteadyFit {
  /** Recording seconds of score second 0 (at the written tempo). */
  startSec: number;
  /** Recording seconds per score second. */
  ratio: number;
}

export interface MarkQuality {
  /** 'good': nothing suspect. 'unsure': worth a look, see `suspectBars`. */
  verdict: 'good' | 'unsure';
  /** The recording keeps one tempo: the steady fit is the better map. */
  steady: boolean;
  fit: SteadyFit;
  /** Indices of bars (into the marks) that look wrong. */
  suspectBars: number[];
  /** Largest distance of a mark from the steady fit (s). */
  maxOffLineSec: number;
}

const median = (values: number[]) => {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/**
 * Robust straight line through the marks (Theil–Sen: median of the slopes between bars at
 * least a quarter of the song apart, then the median intercept). Up to about a quarter of
 * the bars may be wrong without moving it.
 */
export function fitSteadyTempo(song: ScoreSong, marks: BarMark[]): SteadyFit {
  const pts = marks.slice(0, -1).map((m) => ({ x: beatToSec(song.tempoMap, m.beat), y: m.sec }));
  if (pts.length < 2) {
    const m = marks[0];
    return { startSec: m ? m.sec - beatToSec(song.tempoMap, m.beat) : 0, ratio: 1 };
  }
  const gap = Math.max(1, Math.floor(pts.length / 4));
  const slopes: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + gap; j < pts.length; j++) {
      const dx = pts[j].x - pts[i].x;
      if (dx > 0) slopes.push((pts[j].y - pts[i].y) / dx);
    }
  }
  const ratio = slopes.length ? median(slopes) : 1;
  return { ratio, startSec: median(pts.map((p) => p.y - ratio * p.x)) };
}

/** One mark per bar (plus the closing one) on the straight line of `fit`. */
export function steadyMarks(song: ScoreSong, fit: SteadyFit): BarMark[] {
  return song.measureStarts
    .concat(song.end)
    .map((beat) => ({ beat, sec: fit.startSec + fit.ratio * beatToSec(song.tempoMap, beat) }));
}

/** Recording seconds per score second of every bar (the closing mark ends the last bar). */
function barRatios(song: ScoreSong, marks: BarMark[]): number[] {
  const out: number[] = [];
  for (let k = 0; k + 1 < marks.length; k++) {
    const score =
      beatToSec(song.tempoMap, marks[k + 1].beat) - beatToSec(song.tempoMap, marks[k].beat);
    out.push(score > 0 ? (marks[k + 1].sec - marks[k].sec) / score : 1);
  }
  return out;
}

export function assessMarks(song: ScoreSong, marks: BarMark[]): MarkQuality {
  const fit = fitSteadyTempo(song, marks);
  const ratios = barRatios(song, marks);
  const typical = median(ratios) || fit.ratio;
  const off = marks
    .slice(0, -1)
    .map((m) => Math.abs(m.sec - (fit.startSec + fit.ratio * beatToSec(song.tempoMap, m.beat))));
  const near = off.filter((d) => d <= STEADY_SEC).length;
  const steady = off.length > 0 && near / off.length >= STEADY_SHARE;
  const suspect = new Set<number>();
  // the closing mark is extrapolated, so the last bar's own tempo says nothing
  ratios.slice(0, -1).forEach((r, k) => {
    if (Math.abs(r / typical - 1) > BAR_TEMPO_TOLERANCE) suspect.add(k);
  });
  if (steady) off.forEach((d, k) => d > OFF_LINE_SEC && suspect.add(k));
  const implausible = typical > MAX_TEMPO_RATIO || typical < 1 / MAX_TEMPO_RATIO;
  const suspectBars = [...suspect].sort((a, b) => a - b);
  return {
    verdict: suspectBars.length || implausible ? 'unsure' : 'good',
    steady,
    fit,
    suspectBars,
    maxOffLineSec: off.length ? Math.max(...off) : 0,
  };
}

/**
 * Bars at either end whose tempo leaves the song's: an alignment pulls the first bar into a
 * silent count-in or stretches the last one over a fade-out. They follow the tempo of their
 * neighbours instead. The closing mark keeps the last bar's tempo.
 */
export function clampEdgeBars(song: ScoreSong, marks: BarMark[]): BarMark[] {
  if (marks.length < 6) return marks;
  const out = marks.map((m) => ({ ...m }));
  const sec = (beat: number) => beatToSec(song.tempoMap, beat);
  const ratios = barRatios(song, out);
  const inner = median(ratios.slice(2, -2));
  const bad = (r: number) => Math.abs(r / inner - 1) > BAR_TEMPO_TOLERANCE;
  // from the end: bars (closing mark included) placed by the last good bar's tempo
  let last = ratios.length - 1;
  while (last > ratios.length / 2 && bad(ratios[last])) last--;
  for (let k = last + 2; k < out.length; k++) {
    out[k].sec = out[k - 1].sec + inner * (sec(out[k].beat) - sec(out[k - 1].beat));
  }
  let first = 0;
  while (first < ratios.length / 2 && bad(ratios[first])) first++;
  for (let k = first - 1; k >= 0; k--) {
    out[k].sec = out[k + 1].sec - inner * (sec(out[k + 1].beat) - sec(out[k].beat));
  }
  return out;
}

/** Bar map a recording plays with: aligned bar by bar, one steady tempo, or the score's tempo. */
export type MarksMode = 'bars' | 'steady' | 'off';

/** The marks a mode plays with (null: the score tempo plus the offset). */
export function marksForMode(
  song: ScoreSong,
  marks: BarMark[] | null,
  mode: MarksMode,
): BarMark[] | null {
  if (!marks || mode === 'off') return null;
  if (mode === 'bars') return marks;
  return steadyMarks(song, fitSteadyTempo(song, marks));
}

/** The mode a fresh alignment should play with: steady recordings get the straight line. */
export const defaultMode = (quality: MarkQuality): MarksMode =>
  quality.steady ? 'steady' : 'bars';
