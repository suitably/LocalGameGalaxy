/**
 * Clock offset between a pult and the stage, estimated from ping/pong [ID: GAME-MELODIQ-NOTES-PULT-CLOCK]
 *
 * The pult sends its time `t0`, the stage answers with its own time `ts`, the pult notes `t3` on
 * arrival. Assuming the way there and back take equally long, the stage read `ts` at local time
 * (t0 + t3) / 2. Samples with the shortest round trip are the most trustworthy.
 */

export interface ClockSample {
  /** stage time − local time, ms */
  offset: number;
  /** round trip, ms */
  rtt: number;
}

export const CLOCK_SAMPLES_KEPT = 8;
const BEST_SAMPLES = 3;

export function clockSample(t0: number, ts: number, t3: number): ClockSample | null {
  const rtt = t3 - t0;
  if (!(rtt >= 0) || !Number.isFinite(ts)) return null;
  return { offset: ts - (t0 + t3) / 2, rtt };
}

/** Keeps the latest samples (newest last). */
export function addSample(samples: ClockSample[], s: ClockSample): ClockSample[] {
  return [...samples, s].slice(-CLOCK_SAMPLES_KEPT);
}

/** Median offset of the samples with the shortest round trips; null without samples. */
export function estimateOffset(samples: ClockSample[]): ClockSample | null {
  if (!samples.length) return null;
  const best = [...samples].sort((a, b) => a.rtt - b.rtt).slice(0, BEST_SAMPLES);
  const offsets = best.map((s) => s.offset).sort((a, b) => a - b);
  return { offset: offsets[offsets.length >> 1], rtt: best[0].rtt };
}

/** Stage time of a local moment; `inputLatencyMs` is how late this device notices a hit. */
export const toStageTime = (localMs: number, offset: number, inputLatencyMs = 0) =>
  localMs + offset - inputLatencyMs;
