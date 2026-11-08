import type { YouTubeResult } from '../../../../lib/companion/songDownloadApi';

/**
 * A hit counts as the song's recording when its length is within max(8 s, 10 %) of the score's.
 * Why: a score is the song without count-ins or fade-outs and a studio upload adds a few seconds
 * of silence or an intro, so ~10 % covers the same take; live cuts, extended mixes, covers with a
 * different arrangement and "1 hour" loops fall outside and need a person to look at them.
 */
export const DURATION_TOLERANCE_MIN_SEC = 8;
export const DURATION_TOLERANCE_RATIO = 0.1;
/** How many non-matching hits a person is shown to pick from. */
export const REVIEW_CANDIDATES = 5;

export const durationTolerance = (scoreSec: number) =>
  Math.max(DURATION_TOLERANCE_MIN_SEC, scoreSec * DURATION_TOLERANCE_RATIO);

/** False when either length is unknown (YouTube reports 0 for live streams). */
export function isDurationMatch(scoreSec: number, candidateSec: number): boolean {
  if (!Number.isFinite(scoreSec) || !Number.isFinite(candidateSec)) return false;
  if (scoreSec <= 0 || candidateSec <= 0) return false;
  return Math.abs(candidateSec - scoreSec) <= durationTolerance(scoreSec);
}

/** What a batch does with a search result. */
export type RecordingChoice =
  | { kind: 'match'; hit: YouTubeResult }
  | { kind: 'review'; candidates: YouTubeResult[] }
  | { kind: 'none' };

/** The first (best-ranked) hit within tolerance is taken; otherwise a person decides. */
export function chooseRecording(results: YouTubeResult[], scoreSec: number): RecordingChoice {
  if (!results.length) return { kind: 'none' };
  const hit = results.find((r) => isDurationMatch(scoreSec, r.duration));
  if (hit) return { kind: 'match', hit };
  return { kind: 'review', candidates: results.slice(0, REVIEW_CANDIDATES) };
}
