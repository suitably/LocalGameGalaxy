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

/** Beat to jump to so playback starts `leadSec` real seconds before `noteBeat` (not before `minBeat`). */
export function leadInBeat(
  noteBeat: number,
  leadSec: number,
  secPerBeat: number,
  minBeat: number,
): number {
  const lead = secPerBeat > 0 ? Math.max(0, leadSec) / secPerBeat : 0;
  return Math.max(minBeat, noteBeat - lead);
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
