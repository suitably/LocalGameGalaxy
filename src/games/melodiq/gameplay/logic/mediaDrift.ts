/**
 * Drift control for media that follows a master clock [ID: LOGIC-MELODIQ-MEDIA-DRIFT]
 *
 * The instrumental `<audio>` is the song clock. The vocal stem, the background video and a
 * passive screen's audio (TV following the host) are separate decoders with their own clocks,
 * so each one is steered towards its target: a proportional playback-rate change for small
 * offsets (inaudible, converges in a few seconds and never leaves a rest offset), a seek for
 * large ones (a slow rate change would stay audible for too long).
 */
export interface DriftPolicy {
  /** Offsets below this are left alone (clock read jitter). */
  deadbandSec: number;
  /** Offsets above this are fixed with a seek. */
  seekAboveSec: number;
  /** Rate change per second of drift: 0.5 turns 20 ms into +1 %. */
  gainPerSec: number;
  /** Largest rate change, as a fraction of the base rate. */
  maxRateDelta: number;
}

/** Vocal stem against the instrumental: both are heard together, so the band is tight. */
export const STEM_DRIFT_POLICY: DriftPolicy = {
  deadbandSec: 0.002,
  seekAboveSec: 0.06,
  gainPerSec: 0.5,
  maxRateDelta: 0.015,
};

/** Background video against the audio: lip sync tolerates a frame or two. */
export const VIDEO_DRIFT_POLICY: DriftPolicy = {
  deadbandSec: 0.03,
  seekAboveSec: 0.5,
  gainPerSec: 0.5,
  maxRateDelta: 0.05,
};

/** A passive screen's audio (TV) against the host's song clock, which scores the singers. */
export const FOLLOWER_DRIFT_POLICY: DriftPolicy = {
  deadbandSec: 0.008,
  seekAboveSec: 0.12,
  gainPerSec: 0.5,
  maxRateDelta: 0.02,
};

/** Granularity of rate changes (0.1 %). */
const RATE_STEP = 0.001;

export type DriftCorrection = { kind: 'seek' } | { kind: 'rate'; rate: number };

/**
 * What to do about `driftSec` (target time minus the follower's time; positive: the follower is
 * behind). `baseRate` is the master's playback rate.
 */
export function correctDrift(
  driftSec: number,
  baseRate: number,
  policy: DriftPolicy,
): DriftCorrection {
  const abs = Math.abs(driftSec);
  if (!Number.isFinite(driftSec) || abs < policy.deadbandSec) {
    return { kind: 'rate', rate: baseRate };
  }
  if (abs > policy.seekAboveSec) return { kind: 'seek' };
  const delta = Math.max(
    -policy.maxRateDelta,
    Math.min(policy.maxRateDelta, driftSec * policy.gainPerSec),
  );
  // Steps keep the rate from changing on every frame, which decoders answer with glitches
  const stepped = Math.round(delta / RATE_STEP) * RATE_STEP;
  return { kind: 'rate', rate: Number((baseRate * (1 + stepped)).toFixed(4)) };
}

/** Exponential smoothing of a drift reading; `null` starts a new series (after a seek). */
export const smoothDrift = (previous: number | null, raw: number, weight = 0.3): number =>
  previous === null ? raw : previous + (raw - previous) * weight;
