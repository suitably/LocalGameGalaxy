/**
 * Tap-along latency calibration [ID: MOD-AUDIO-LATENCY-TAP-ALONG]
 *
 * The player taps (or plays) along to a series of clicks. Each tap is matched to the nearest click;
 * the median delay is how late this player's input arrives relative to the sound they hear. It
 * covers everything at once: the audio output of the device that clicks (speakers, TV, Bluetooth),
 * the input device (touch, MIDI, microphone) and the player's own habit. Like the audio
 * calibration of rhythm games, the first clicks are a warm-up and inconsistent tapping fails.
 */

export const TAP_ALONG_CLICKS = 12;
export const TAP_ALONG_INTERVAL_MS = 600;
/** Clicks before this many are only for finding the beat. */
const WARM_UP = 3;
/** At least this many matched taps after the warm-up. */
const MIN_TAPS = 6;
/** Taps further than this from every click are ignored. */
const MAX_DISTANCE_MS = 250;
/** Mean distance from the median above this means the taps were too uneven. */
const MAX_SPREAD_MS = 35;

export type TapAlongResult =
  | { ok: true; latencyMs: number; spreadMs: number; taps: number }
  | { ok: false; reason: 'few_taps' | 'uneven'; taps: number };

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Click times and tap times on the same clock (ms). */
export function tapAlongLatency(clicks: number[], taps: number[]): TapAlongResult {
  const counted = clicks.slice(WARM_UP);
  const deltas: number[] = [];
  const used = new Set<number>();
  for (const tap of taps) {
    let best = -1;
    for (let i = 0; i < counted.length; i++)
      if (best < 0 || Math.abs(tap - counted[i]) < Math.abs(tap - counted[best])) best = i;
    if (best < 0 || used.has(best)) continue;
    const d = tap - counted[best];
    if (Math.abs(d) > MAX_DISTANCE_MS) continue;
    used.add(best);
    deltas.push(d);
  }
  if (deltas.length < MIN_TAPS) return { ok: false, reason: 'few_taps', taps: deltas.length };
  const mid = median(deltas);
  const spread = deltas.reduce((sum, d) => sum + Math.abs(d - mid), 0) / deltas.length;
  if (spread > MAX_SPREAD_MS) return { ok: false, reason: 'uneven', taps: deltas.length };
  return {
    ok: true,
    latencyMs: Math.round(mid),
    spreadMs: Math.round(spread),
    taps: deltas.length,
  };
}

/** Click times for one calibration run, starting `leadMs` after `now`. */
export const tapAlongClicks = (now: number, leadMs = 800) =>
  Array.from({ length: TAP_ALONG_CLICKS }, (_, i) => now + leadMs + i * TAP_ALONG_INTERVAL_MS);
