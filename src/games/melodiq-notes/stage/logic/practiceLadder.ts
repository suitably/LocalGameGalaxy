/**
 * Guided practice of the weak bars after a performance (#638): each weak bar (with the one after
 * it) loops at rising speed (50 / 75 / 100 %, starting at `START_STEP`); three passes in a row at
 * 90 % or more move up a step. A bar done at 100 % is green and the next weakest one follows. Pure; `usePracticeLadder` drives it.
 */
import { sectionScore } from './judging';
import type { SectionStat } from './judging';

export const LADDER_SPEEDS = [0.5, 0.75, 1] as const;
/** Share of a pass that must be right for it to count. */
export const PASS_SCORE = 0.9;
/**
 * Step a bar picked from the results starts at: 75 %, as the maintainer asked (2026-11-05); #638
 * suggests 50 %, which is index 0.
 */
export const START_STEP = 1;
/** Passes in a row needed to move one step up. */
export const PASSES_PER_STEP = 3;
/** Bars scoring below this in the performance get practised (as `weakestSection`). */
const WEAK_BELOW = 0.95;

export interface Ladder {
  /** Weak bars (section indices), weakest first. */
  bars: number[];
  /** Index into `bars` of the bar being practised. */
  at: number;
  /** Index into LADDER_SPEEDS. */
  step: number;
  /** Good passes in a row at this step. */
  streak: number;
}

export type PassOutcome = 'again' | 'faster' | 'bar_done';

/** Weak bars of a performance, weakest first; `scores` from `sectionScore` per section. */
export function weakBars(scores: (number | null)[]): number[] {
  return scores
    .map((score, bar) => ({ score, bar }))
    .filter((s): s is { score: number; bar: number } => s.score !== null && s.score < WEAK_BELOW)
    .sort((a, b) => a.score - b.score || a.bar - b.bar)
    .map((s) => s.bar);
}

/** A ladder over the weak bars, starting with `first` when given (the bar the player picked). */
export function startLadder(scores: (number | null)[], first?: number): Ladder | null {
  const weak = weakBars(scores);
  const bars = first === undefined ? weak : [first, ...weak.filter((b) => b !== first)];
  return bars.length ? { bars, at: 0, step: START_STEP, streak: 0 } : null;
}

export const ladderBar = (l: Ladder) => l.bars[l.at];
export const ladderSpeed = (l: Ladder) => LADDER_SPEEDS[l.step];

/** Score of one loop pass over sections `first..last`; a pass without notes counts as right. */
export function passScore(sections: SectionStat[], first: number, last: number): number {
  let sum = 0;
  let n = 0;
  for (let s = first; s <= last; s++) {
    const v = sections[s] && sectionScore(sections[s]);
    if (v === null || v === undefined) continue;
    sum += v;
    n++;
  }
  return n ? sum / n : 1;
}

/** The ladder after one pass that scored `score`. */
export function afterPass(l: Ladder, score: number): { ladder: Ladder; outcome: PassOutcome } {
  if (score < PASS_SCORE) return { ladder: { ...l, streak: 0 }, outcome: 'again' };
  const streak = l.streak + 1;
  if (streak < PASSES_PER_STEP) return { ladder: { ...l, streak }, outcome: 'again' };
  if (l.step + 1 < LADDER_SPEEDS.length)
    return { ladder: { ...l, step: l.step + 1, streak: 0 }, outcome: 'faster' };
  return { ladder: { ...l, streak }, outcome: 'bar_done' };
}

/** The next weak bar from the start step again, or null when every bar is done. */
export function nextBar(l: Ladder): Ladder | null {
  return l.at + 1 < l.bars.length ? { ...l, at: l.at + 1, step: START_STEP, streak: 0 } : null;
}
