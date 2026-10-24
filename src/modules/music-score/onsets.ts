import type { BarMark } from './types';

/** Hop of the broadband flux envelope (`onsetFeatures`). */
const ONSET_HOP_SEC = 0.01;
const ONSET_SEARCH_SEC = 0.12;
const FIRST_BAR_SEARCH_SEC = 0.4;

/** Moves each mark onto the strongest nearby onset, preferring closer ones; weak evidence keeps the mark. */
export function refineMarksWithOnsets(marks: BarMark[], onsets: Float32Array): BarMark[] {
  const radius = Math.round(ONSET_SEARCH_SEC / ONSET_HOP_SEC);
  const out = marks.map((mk) => {
    const c = Math.round(mk.sec / ONSET_HOP_SEC);
    const lo = Math.max(0, c - radius);
    const hi = Math.min(onsets.length - 1, c + radius);
    if (hi <= lo) return mk;
    const window = Array.from(onsets.subarray(lo, hi + 1)).sort((a, b) => a - b);
    const median = window[window.length >> 1];
    let best = -1;
    let bestScore = 0;
    for (let k = lo; k <= hi; k++) {
      const score = onsets[k] * (1 - (0.5 * Math.abs(k - c)) / radius);
      if (score > bestScore) {
        bestScore = score;
        best = k;
      }
    }
    if (best < 0 || onsets[best] < median * 1.8) return mk;
    return { beat: mk.beat, sec: best * ONSET_HOP_SEC };
  });
  if (out.length) out[0] = firstOnset(out[0], onsets);
  for (let k = 1; k < out.length; k++) {
    if (out[k].sec <= out[k - 1].sec + 0.05) out[k] = { ...out[k], sec: out[k - 1].sec + 0.05 };
  }
  return out;
}

/**
 * The warp is least reliable where the music starts (silence or noise before it),
 * so bar 1 snaps to the first clear onset within a wider window.
 */
function firstOnset(mark: BarMark, onsets: Float32Array): BarMark {
  const sorted = Array.from(onsets).sort((a, b) => a - b);
  const strong = Math.max(
    sorted[Math.floor(sorted.length * 0.9)] ?? 0,
    (sorted[sorted.length >> 1] ?? 0) * 3,
  );
  const radius = Math.round(FIRST_BAR_SEARCH_SEC / ONSET_HOP_SEC);
  const c = Math.round(mark.sec / ONSET_HOP_SEC);
  for (let k = Math.max(0, c - radius); k <= Math.min(onsets.length - 1, c + radius); k++) {
    if (
      onsets[k] >= strong &&
      onsets[k] >= (onsets[k - 1] ?? 0) &&
      onsets[k] >= (onsets[k + 1] ?? 0)
    ) {
      return { beat: mark.beat, sec: k * ONSET_HOP_SEC };
    }
  }
  return mark;
}
