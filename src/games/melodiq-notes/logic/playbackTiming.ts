import type { TargetNote } from '../useNoteVerifier';

/** Lower bound so very slow speed settings never stall playback. */
const MIN_EFFECTIVE_BPM = 20;

export function computeEffectiveBpm(baseBpm: number, speedPercent: number): number {
  return Math.max(MIN_EFFECTIVE_BPM, Math.round(baseBpm * (speedPercent / 100)));
}

/**
 * Converts a note length given as a fraction of a whole note (OSMD `RealValue`,
 * e.g. 0.25 = quarter) into seconds at the given tempo.
 */
export function noteDurationSeconds(fraction: number | undefined, bpm: number): number {
  const beatDuration = 60 / bpm;
  if (!fraction || fraction <= 0) return beatDuration;
  return Math.max(0.08, fraction * 4 * beatDuration);
}

/** Seconds until the cursor should advance past the given notes. */
export function stepDurationSeconds(notes: TargetNote[], bpm: number): number {
  const beatDuration = 60 / bpm;
  if (notes.length === 0) return beatDuration;
  const stepFraction = notes[0]?.stepDuration ?? Math.min(...notes.map((n) => n.duration ?? 0.25));
  if (!stepFraction || stepFraction <= 0) return beatDuration;
  return Math.max(0.05, stepFraction * 4 * beatDuration);
}

/** Delay before the next continuous-mode step, in milliseconds. */
export function continuousStepDelayMs(
  currentTargets: TargetNote[],
  allNotes: TargetNote[],
  bpm: number,
): number {
  const notes = currentTargets.length > 0 ? currentTargets : allNotes;
  return Math.max(30, Math.round(stepDurationSeconds(notes, bpm) * 1000));
}

/**
 * Wait mode: how long to pause before auto-advancing, or `null` when the player
 * still has to hit the current note.
 */
export function waitModeAdvanceDelayMs(
  targetNotes: TargetNote[],
  isCurrentNoteHit: boolean,
  bpm: number,
): number | null {
  const isSilentStep =
    targetNotes.length > 0 && targetNotes.every((t) => t.isRest || t.isTiedContinuation);
  if (!isSilentStep && !isCurrentNoteHit) return null;

  const stepSec = stepDurationSeconds(targetNotes, bpm);
  return isSilentStep
    ? Math.max(200, Math.round(stepSec * 1000))
    : Math.min(400, Math.max(180, Math.round(stepSec * 500)));
}
