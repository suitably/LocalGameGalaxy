/**
 * Drift control for media that follows a master clock [ID: LOGIC-MELODIQ-MEDIA-DRIFT]
 *
 * The instrumental `<audio>` is the song clock. The vocal stem, the background video and a
 * passive screen's audio (TV following the host) are separate decoders with their own clocks,
 * so each one is steered towards its target.
 *
 * Every playback-rate change restarts the browser's time stretcher, which is audible and moves
 * the position by a few tens of milliseconds. So the rate is changed as rarely as possible
 * (hysteresis): nothing happens until the offset passes `engageSec`, then one fixed rate runs
 * until the offset is back under `releaseSec`, then the base rate returns. Large offsets are
 * fixed with a seek.
 */
export interface DriftPolicy {
  /** Offsets up to this are left alone (clock read jitter, inaudible). */
  engageSec: number;
  /** A running correction stops once the offset is back under this. */
  releaseSec: number;
  /** Offsets above this are fixed with a seek. */
  seekAboveSec: number;
  /** Rate change while correcting, as a fraction of the base rate. */
  rateDelta: number;
}

/** Vocal stem against the instrumental: both are heard together. */
export const STEM_DRIFT_POLICY: DriftPolicy = {
  engageSec: 0.025,
  releaseSec: 0.005,
  seekAboveSec: 0.12,
  rateDelta: 0.01,
};

/** Background video against the audio: lip sync tolerates a frame or two. */
export const VIDEO_DRIFT_POLICY: DriftPolicy = {
  engageSec: 0.06,
  releaseSec: 0.02,
  seekAboveSec: 0.5,
  rateDelta: 0.05,
};

/** A passive screen's audio (TV) against the host's song clock, which scores the singers. */
export const FOLLOWER_DRIFT_POLICY: DriftPolicy = {
  engageSec: 0.04,
  releaseSec: 0.01,
  seekAboveSec: 0.25,
  rateDelta: 0.015,
};

/** Direction of a running correction: 1 speeds the follower up, -1 slows it down, 0 is none. */
export type DriftDirection = -1 | 0 | 1;

export type DriftCorrection =
  { kind: 'seek' } | { kind: 'rate'; rate: number; direction: DriftDirection };

/**
 * What to do about `driftSec` (target time minus the follower's time; positive: the follower is
 * behind). `baseRate` is the master's playback rate, `direction` the previous result's direction
 * (0 after a seek or at the start).
 */
export function correctDrift(
  driftSec: number,
  baseRate: number,
  policy: DriftPolicy,
  direction: DriftDirection = 0,
): DriftCorrection {
  const idle: DriftCorrection = { kind: 'rate', rate: baseRate, direction: 0 };
  if (!Number.isFinite(driftSec)) return idle;
  const abs = Math.abs(driftSec);
  if (abs > policy.seekAboveSec) return { kind: 'seek' };
  const sign: DriftDirection = driftSec > 0 ? 1 : -1;
  // A running correction continues down to the release threshold, but never past zero
  const threshold = direction === sign ? policy.releaseSec : policy.engageSec;
  if (abs <= threshold) return idle;
  return {
    kind: 'rate',
    rate: Number((baseRate * (1 + sign * policy.rateDelta)).toFixed(4)),
    direction: sign,
  };
}

/** Exponential smoothing of a drift reading; `null` starts a new series (after a seek). */
export const smoothDrift = (previous: number | null, raw: number, weight = 0.3): number =>
  previous === null ? raw : previous + (raw - previous) * weight;
