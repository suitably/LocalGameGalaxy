/**
 * The stage's song clock on a pult [ID: GAME-MELODIQ-NOTES-PULT-STAGE-CLOCK]
 *
 * The stage sends its transport (`StageClock`) a few times per second. A pult converts its own
 * time to stage time (clockSync) and extrapolates the beat from the latest clock. Frames follow
 * that target smoothly: small differences are pulled in, a jump (seek, loop, pause) is taken at once.
 */
import type { StageClock } from './protocol';

/** Pull per frame towards the stage's beat. */
const FOLLOW_PULL = 0.1;
/** Beyond this many seconds apart the pult jumps to the stage's beat. */
const FOLLOW_SNAP_SEC = 0.15;
/** A beat this far behind the pult's is a rewind (loop, seek), not jitter. */
export const REWIND_BEATS = 0.25;

/** The stage's beat at stage time `stageMs`. */
export function stageBeatAt(clock: StageClock, stageMs: number): number {
  if (clock.play !== 'playing') return clock.beat;
  return clock.beat + ((stageMs - clock.at) / 1000) * clock.rate;
}

/** The pult's beat one frame (`dt` seconds) later, following `target`. */
export function followBeat(current: number, target: number, dt: number, rate: number): number {
  const predicted = current + dt * rate;
  const diff = target - predicted;
  if (rate <= 0 || Math.abs(diff) / rate > FOLLOW_SNAP_SEC) return target;
  return predicted + diff * FOLLOW_PULL;
}
