import type { AudioMap } from '../../../../modules/music-score';

/** Lead-in choices (seconds before the first note) offered next to "jump to first note". */
export const LEAD_IN_OPTIONS_SEC = [0, 1, 2, 3, 5, 10] as const;
export const DEFAULT_LEAD_IN_SEC = 3;

/** Earliest note start over all players, or null when nobody has notes. */
export function firstNoteBeat(noteSets: { t: number }[][]): number | null {
  let first: number | null = null;
  for (const notes of noteSets) {
    for (const n of notes) if (first === null || n.t < first) first = n.t;
  }
  return first;
}

/**
 * Beat to jump to so `leadSec` seconds of the song lie before `noteBeat` (not before `minBeat`).
 * Goes through the map, because the bars before the note can run at another tempo than the note's.
 */
export function leadInBeat(
  noteBeat: number,
  leadSec: number,
  map: AudioMap,
  minBeat: number,
): number {
  return Math.max(minBeat, map.beatAt(map.secAt(noteBeat) - Math.max(0, leadSec)));
}

/** Maps a 0..1 position on the timeline bar to a beat. */
export function beatFromFraction(fraction: number, end: number): number {
  return Math.min(1, Math.max(0, fraction)) * end;
}

/** Position on the timeline bar (0..1) for a beat; the count-in counts as the start. */
export function fractionOfBeat(beat: number, end: number): number {
  return end > 0 ? Math.min(1, Math.max(0, beat / end)) : 0;
}

/** Accepts a stored lead-in only when it is one of the offered values. */
export function parseLeadIn(raw: unknown): number {
  const n = typeof raw === 'string' ? Number(raw) : raw;
  return LEAD_IN_OPTIONS_SEC.find((o) => o === n) ?? DEFAULT_LEAD_IN_SEC;
}

/** True when every player's notes have ended by `beat` (nothing left to play before the song ends). */
export function noNotesAhead(noteSets: { t: number; dur: number }[][], beat: number): boolean {
  return noteSets.every((notes) => notes.every((n) => n.t + n.dur <= beat));
}
