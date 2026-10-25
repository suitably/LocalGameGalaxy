/** Pure helpers for the alignment fine-tuning offset and the continuous playback speed. */

export const SPEED_MIN = 0.25;
export const SPEED_MAX = 1.5;
export const SPEED_STEP = 0.05;

/** Offset range of the fine-tuning slider, in seconds (±). */
export const OFFSET_RANGE_SEC = 2;
export const OFFSET_COARSE_SEC = 0.01;
export const OFFSET_FINE_SEC = 0.001;

/** Clamps to 25–150 % and snaps to whole 5 % steps (avoids float drift such as 0.7000000001). */
export function snapSpeed(speed: number): number {
  if (!Number.isFinite(speed)) return 1;
  const clamped = Math.min(SPEED_MAX, Math.max(SPEED_MIN, speed));
  return Math.round(Math.round(clamped / SPEED_STEP) * SPEED_STEP * 100) / 100;
}

/** Adds `deltaSec` to the offset, rounded to whole milliseconds and limited to ±OFFSET_RANGE_SEC. */
export function nudgeOffset(offsetSec: number, deltaSec: number): number {
  const next = Math.round((offsetSec + deltaSec) * 1000) / 1000;
  return Math.min(OFFSET_RANGE_SEC, Math.max(-OFFSET_RANGE_SEC, next));
}

export const formatOffsetMs = (offsetSec: number): string => {
  const ms = Math.round(offsetSec * 1000);
  return `${ms > 0 ? '+' : ''}${ms} ms`;
};
