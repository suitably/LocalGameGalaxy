/**
 * The host's song position, estimated on another device [ID: LOGIC-MELODIQ-REMOTE-CLOCK]
 *
 * A TV or phone gets the host's `currentTime` in `GAME_STATE` messages. Every message is late by
 * its transport delay, and that delay jitters (WebRTC, cast, a busy main thread). The clocks of
 * two devices cannot be compared, so the delay is not measured; instead the message that
 * arrived fastest in the last few seconds is trusted (minimum-delay filter, as in NTP): it gives
 * the largest "host time minus local time" offset. Between messages the position runs on the
 * local monotonic clock, so it neither stalls with a dropped frame nor jumps with a late packet.
 *
 * A report far ahead of the estimate is a forward seek on the host and is followed at once. A
 * report far behind is usually just late (Wi-Fi hiccup, busy receiver); following it made the TV
 * jump back and, with the next normal report, forward again. So the clock only goes back once
 * the lower position has held for `confirmBackMs` without a normal report in between.
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
  /** How long reports must stay far behind the estimate before it follows them back. */
  confirmBackMs?: number;
}

interface OffsetSample {
  offsetSec: number;
  atMs: number;
}

export function createRemoteClock({
  windowMs = 3000,
  jumpSec = 0.3,
  confirmBackMs = 500,
}: RemoteClockOptions = {}): RemoteClock {
  let samples: OffsetSample[] = [];
  /** Reports far behind the estimate, waiting for confirmation as a backward seek. */
  let behind: OffsetSample[] = [];
  let playing = false;
  let frozenAtSec = 0;

  const bestOffset = (): number | null =>
    samples.length === 0 ? null : Math.max(...samples.map((s) => s.offsetSec));

  return {
    update(hostTimeSec, isPlaying, nowMs) {
      if (!isPlaying) {
        playing = false;
        samples = [];
        behind = [];
        frozenAtSec = hostTimeSec;
        return;
      }
      const offsetSec = hostTimeSec - nowMs / 1000;
      const sample = { offsetSec, atMs: nowMs };
      const best = bestOffset();
      if (!playing || best === null || offsetSec - best > jumpSec) {
        // First report, or a forward seek on the host: follow at once
        samples = [sample];
        behind = [];
        playing = true;
        return;
      }
      if (best - offsetSec > jumpSec) {
        // Far behind: a late report or a backward seek; only the latter persists
        if (behind.length > 0 && Math.abs(offsetSec - behind[0].offsetSec) > jumpSec) behind = [];
        behind.push(sample);
        if (nowMs - behind[0].atMs >= confirmBackMs) {
          samples = behind;
          behind = [];
        }
        return;
      }
      behind = []; // A normal report: the low ones were just late
      samples = samples.filter((s) => nowMs - s.atMs <= windowMs);
      samples.push(sample);
    },
    now(nowMs) {
      const best = bestOffset();
      return playing && best !== null ? nowMs / 1000 + best : frozenAtSec;
    },
    reset() {
      samples = [];
      behind = [];
      playing = false;
      frozenAtSec = 0;
    },
  };
}
