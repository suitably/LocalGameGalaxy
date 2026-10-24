import type { BarMark } from './types';

/** Bars on an unpinned side that follow a moved bar, fading out (the alignment is usually off only locally). */
const TAPER_BARS = 4;
const MIN_GAP_SEC = 0.05;

/** Index of the bar start nearest to `sec` (the closing end mark excluded). */
export function nearestBar(marks: BarMark[], sec: number): number {
  let best = 0;
  for (let k = 1; k < marks.length - 1; k++) {
    if (Math.abs(marks[k].sec - sec) < Math.abs(marks[best].sec - sec)) best = k;
  }
  return best;
}

/**
 * Moves bar `index` to `sec` and pins it there. Between the bar and a
 * neighbouring pin the marks are stretched so their spacing scales with the
 * move; on a side without a pin the move fades out over a few bars. Returns
 * null when the bar would pass a pinned neighbour.
 */
export function pinBar(
  marks: BarMark[],
  pins: number[],
  index: number,
  sec: number,
): { marks: BarMark[]; pins: number[] } | null {
  const others = pins.filter((p) => p !== index);
  const before = Math.max(-1, ...others.filter((p) => p < index));
  const after = Math.min(marks.length, ...others.filter((p) => p > index));
  const lo = before >= 0 ? marks[before].sec : -Infinity;
  const hi = after < marks.length ? marks[after].sec : Infinity;
  if (sec <= lo + MIN_GAP_SEC * (index - before) || sec >= hi - MIN_GAP_SEC * (after - index))
    return null;
  const old = marks[index].sec;
  const delta = sec - old;
  const out = marks.map((m, k) => {
    let at = m.sec;
    if (k === index) at = sec;
    else if (k < index && k > before) {
      at =
        before >= 0
          ? lo + ((m.sec - lo) * (sec - lo)) / (old - lo)
          : m.sec + delta * Math.max(0, 1 - (index - k) / TAPER_BARS);
    } else if (k > index && k < after) {
      at =
        after < marks.length
          ? hi - ((hi - m.sec) * (hi - sec)) / (hi - old)
          : m.sec + delta * Math.max(0, 1 - (k - index) / TAPER_BARS);
    }
    return { beat: m.beat, sec: at };
  });
  // a large move can overtake the faded neighbours: push them along
  for (let k = index - 1; k > before; k--)
    out[k].sec = Math.min(out[k].sec, out[k + 1].sec - MIN_GAP_SEC);
  for (let k = index + 1; k < after; k++)
    out[k].sec = Math.max(out[k].sec, out[k - 1].sec + MIN_GAP_SEC);
  return { marks: out, pins: [...others, index].sort((a, b) => a - b) };
}
