/**
 * The host's song position, estimated on another device [ID: LOGIC-MELODIQ-REMOTE-CLOCK]
 *
 * A TV or phone gets the host's `currentTime` in `GAME_STATE` messages. Every message is late by
 * its transport delay, and that delay jitters (WebRTC, cast, a busy main thread). The clocks of
 * two devices cannot be compared, so the delay is not measured; instead the message that
 * arrived fastest in the last few seconds is trusted (minimum-delay filter, as in NTP): it gives
 * the largest "host time minus local time" offset. Between messages the position runs on the
 * local monotonic clock, so it neither stalls with a dropped frame nor jumps with a late packet.
 */
export interface RemoteClock {
  /** Feed one host report. `nowMs` is the local monotonic receive time (`performance.now()`). */
  update(hostTimeSec: number, isPlaying: boolean, nowMs: number): void;
  /** Estimated host song position at `nowMs`. */
  now(nowMs: number): number;
  reset(): void;
}

export interface RemoteClockOptions {
  /** How long a fast message stays the reference. */
  windowMs?: number;
  /** A report this far from the estimate is a seek on the host, not jitter. */
  jumpSec?: number;
}

interface OffsetSample {
  offsetSec: number;
  atMs: number;
}

export function createRemoteClock({
  windowMs = 3000,
  jumpSec = 0.3,
}: RemoteClockOptions = {}): RemoteClock {
  let samples: OffsetSample[] = [];
  let playing = false;
  let frozenAtSec = 0;

  const bestOffset = (): number | null =>
    samples.length === 0 ? null : Math.max(...samples.map((s) => s.offsetSec));

  return {
    update(hostTimeSec, isPlaying, nowMs) {
      if (!isPlaying) {
        playing = false;
        samples = [];
        frozenAtSec = hostTimeSec;
        return;
      }
      const offsetSec = hostTimeSec - nowMs / 1000;
      const best = bestOffset();
      if (!playing || (best !== null && Math.abs(offsetSec - best) > jumpSec)) samples = [];
      playing = true;
      samples = samples.filter((s) => nowMs - s.atMs <= windowMs);
      samples.push({ offsetSec, atMs: nowMs });
    },
    now(nowMs) {
      const best = bestOffset();
      return playing && best !== null ? nowMs / 1000 + best : frozenAtSec;
    },
    reset() {
      samples = [];
      playing = false;
      frozenAtSec = 0;
    },
  };
}
