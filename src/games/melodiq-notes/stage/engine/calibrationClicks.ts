import { tapAlongClicks } from '../../../../modules/audio/latency';
import type { StageEngine } from './StageEngine';

/** Plays one tap-along calibration run on this device; returns the click times (`performance.now()`). */
export function playCalibrationClicks(e: StageEngine): number[] | null {
  const sound = e.sound;
  if (!sound.clickAt) return null;
  const times = tapAlongClicks(performance.now());
  times.forEach((t, i) => sound.clickAt?.(t, i % 4 === 0));
  return times;
}
