import type { MicrophoneManager } from '../MicrophoneManager';

export interface BeepSample {
  found: boolean;
  latency: number;
  peak: number;
}

export interface DetectBeepOptions {
  /** Delay before listening starts (just before the beep is expected). */
  startDelayMs: number;
  /** Louder samples earlier than this are ignored. */
  minElapsedMs: number;
  /** Subtracted from the elapsed time, e.g. the scheduled beep offset. */
  latencyOffsetMs: number;
  timeoutMs?: number;
}

/** Listens on `mic` until the volume crosses `threshold` or the timeout passes. */
export function detectBeep(
  mic: MicrophoneManager,
  threshold: number,
  { startDelayMs, minElapsedMs, latencyOffsetMs, timeoutMs = 1000 }: DetectBeepOptions,
): Promise<BeepSample> {
  return new Promise((resolve) => {
    const checkStart = Date.now();
    let peak = 0;

    const loop = () => {
      const vol = mic.getCurrentVolume();
      if (vol > peak) peak = vol;
      const elapsed = Date.now() - checkStart;

      if (vol > threshold && elapsed > minElapsedMs) {
        resolve({ found: true, latency: elapsed - latencyOffsetMs, peak });
      } else if (elapsed > timeoutMs) {
        resolve({ found: false, latency: 0, peak });
      } else {
        requestAnimationFrame(loop);
      }
    };

    setTimeout(loop, startDelayMs);
  });
}
