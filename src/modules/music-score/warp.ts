/**
 * Dynamic time warping of a score against a recording (frame features), with free ends, skipped
 * ends and affine gaps in the middle. Used by `alignRecording`.
 */
import type { AlignProgress } from './alignment';

/** Extra cost of a tempo-changing step: recordings mostly keep a steady tempo, a weakly matching mix should not wander. */
const STEP_PENALTY = 0.2;
/** Score × recording frame pairs sampled by `unrelatedCost`. */
const BASELINE_SAMPLES = 4000;
/** Matched frames whose tempo the skipped ends continue. */
const EXTRAPOLATE_FRAMES = 100;

/** Mean cost of score and recording frames paired at random (sampled on a fixed lattice). */
export function unrelatedCost(n: number, m: number, cost: (i: number, j: number) => number) {
  let sum = 0;
  for (let k = 0; k < BASELINE_SAMPLES; k++) {
    // golden-ratio lattice: evenly spread, deterministic
    sum += cost(
      Math.floor(((k * 0.618034) % 1) * n),
      Math.floor(((k + 0.5) / BASELINE_SAMPLES) * m),
    );
  }
  return sum / BASELINE_SAMPLES;
}

/**
 * Dynamic time warping of n score frames against m recording frames with steps
 * (1,1), (1,2), (2,1): tempo may differ by up to a factor of two. The start in
 * the recording is free (intros, silence) and the end is chosen by mean cost.
 * Up to `maxSkip` score frames at either end may stay unmatched at `skipCost` each
 * (an arrangement's extra intro or outro); they continue the tempo of the matched
 * path next to them.
 *
 * With finite `gap` costs the path may also leave out a stretch in the middle
 * (affine gaps: `open` once, then a cost per frame left out, so a short gap is
 * not worth it): recording frames the score lacks (an
 * extra chorus or solo; the score waits) or score frames the recording lacks (a
 * repeat the band did not play; they collapse onto one moment).
 *
 * Returns the recording frame of every score frame and the mean cost along the matched path.
 */
export async function warpScoreToAudio(
  n: number,
  m: number,
  cost: (i: number, j: number) => number,
  onProgress?: AlignProgress,
  {
    maxSkip = 0,
    skipCost = 0,
    gap,
  }: {
    maxSkip?: number;
    skipCost?: number;
    gap?: { open: number; extendRecording: number; extendScore: number };
  } = {},
): Promise<{ at: Float64Array; meanCost: number }> {
  const INF = 1e30;
  const skip = Math.max(0, Math.min(maxSkip, n - 1));
  const gaps = !!gap;
  const openH = gap ? gap.open + gap.extendRecording : INF;
  const extendH = gap ? gap.extendRecording : INF;
  const openV = gap ? gap.open + gap.extendScore : INF;
  const extendV = gap ? gap.extendScore : INF;
  // matched cells: 0 diagonal, 1 fast, 2 slow, 3 path starts here (score frames before it
  // skipped), 4 after a recording gap (H), 5 after a score gap (V)
  const steps = new Int8Array(n * m);
  // gap cells, one bit each: set when the gap was extended, clear when it was opened
  const GAP_H = 1;
  const GAP_V = 2;
  const gapSteps = gaps ? new Uint8Array(n * m) : null;
  const row = () => new Float64Array(m).fill(INF);
  let prev2 = row();
  let prev = row();
  let cur = row();
  let prevH = row();
  let curH = row();
  let prevV = row();
  let curV = row();
  // recording frame each path starts at, so the end can be chosen by the path's own mean cost
  let from2 = new Int32Array(m);
  let from = Int32Array.from({ length: m }, (_, j) => j);
  let fromCur = new Int32Array(m);
  let fromPrevH = new Int32Array(m);
  let fromCurH = new Int32Array(m);
  let fromPrevV = new Int32Array(m);
  let fromCurV = new Int32Array(m);
  for (let j = 0; j < m; j++) {
    prev[j] = cost(0, j);
    steps[j] = 3;
  }
  let bestEnd = INF;
  let endRow = n - 1;
  let endCol = 0;
  // a path covers about n + (its recording span) cells; skipped frames count as cells at skipCost
  const considerEnds = (r: number, acc: Float64Array, starts: Int32Array) => {
    if (r < n - 1 - skip) return;
    for (let k = 0; k < m; k++) {
      const v = (acc[k] + (n - 1 - r) * skipCost) / (n + k - starts[k] + 1);
      if (v < bestEnd) {
        bestEnd = v;
        endRow = r;
        endCol = k;
      }
    }
  };
  considerEnds(0, prev, from);
  for (let i = 1; i < n; i++) {
    const fresh = i <= skip ? i * skipCost : INF;
    for (let j = 0; j < m; j++) {
      const diag = j >= 1 ? prev[j - 1] : INF;
      const fast = j >= 2 ? prev[j - 2] + STEP_PENALTY : INF;
      const slow = i >= 2 && j >= 1 ? prev2[j - 1] + cost(i - 1, j) + STEP_PENALTY : INF;
      let best = diag;
      let step = 0;
      let start = j >= 1 ? from[j - 1] : 0;
      if (fast < best) {
        best = fast;
        step = 1;
        start = from[j - 2];
      }
      if (slow < best) {
        best = slow;
        step = 2;
        start = from2[j - 1];
      }
      if (fresh < best) {
        best = fresh;
        step = 3;
        start = j;
      }
      if (gaps && j >= 1) {
        if (prevH[j - 1] < best) {
          best = prevH[j - 1];
          step = 4;
          start = fromPrevH[j - 1];
        }
        if (prevV[j - 1] < best) {
          best = prevV[j - 1];
          step = 5;
          start = fromPrevV[j - 1];
        }
      }
      cur[j] = best + cost(i, j);
      fromCur[j] = start;
      steps[i * m + j] = step;
      if (!gapSteps) continue;
      // recording frame j left out: score frame i waits
      const toH = j >= 1 ? cur[j - 1] + openH : INF;
      const alongH = j >= 1 ? curH[j - 1] + extendH : INF;
      curH[j] = Math.min(toH, alongH);
      let bits = alongH < toH ? GAP_H : 0;
      fromCurH[j] = j < 1 ? j : alongH < toH ? fromCurH[j - 1] : fromCur[j - 1];
      // score frame i left out at recording frame j
      const toV = prev[j] + openV;
      const alongV = prevV[j] + extendV;
      curV[j] = Math.min(toV, alongV);
      if (alongV < toV) bits |= GAP_V;
      gapSteps[i * m + j] = bits;
      fromCurV[j] = alongV < toV ? fromPrevV[j] : from[j];
    }
    considerEnds(i, cur, fromCur);
    [prev2, prev, cur] = [prev, cur, prev2];
    [from2, from, fromCur] = [from, fromCur, from2];
    [prevH, curH] = [curH, prevH];
    [prevV, curV] = [curV, prevV];
    [fromPrevH, fromCurH] = [fromCurH, fromPrevH];
    [fromPrevV, fromCurV] = [fromCurV, fromPrevV];
    if (onProgress && i % 200 === 0) await onProgress('match', i / n);
  }
  const at = new Float64Array(n);
  // each score frame keeps the first (latest) recording frame the walk back meets it at
  let placedFrom = n;
  const place = (r: number, c: number) => {
    if (r < placedFrom) {
      at[r] = c;
      placedFrom = r;
    }
  };
  let i = endRow;
  let j = Math.max(0, endCol);
  let state: 'M' | 'H' | 'V' = 'M';
  let sum = 0;
  let cells = 0;
  for (;;) {
    place(i, j);
    if (state === 'H' && gapSteps) {
      // the score waits at frame i; back along the recording
      const ext = (gapSteps[i * m + j] & GAP_H) !== 0;
      j--;
      if (!ext) state = 'M';
      continue;
    }
    if (state === 'V' && gapSteps) {
      const ext = (gapSteps[i * m + j] & GAP_V) !== 0;
      i--;
      if (!ext) state = 'M';
      continue;
    }
    sum += cost(i, j);
    cells++;
    if (i === 0) break;
    const step = steps[i * m + j];
    if (step === 3) break;
    if (step === 0) {
      i--;
      j--;
    } else if (step === 1) {
      i--;
      j -= 2;
    } else if (step === 2) {
      place(i - 1, j - 1);
      sum += cost(i - 1, j - 1);
      cells++;
      i -= 2;
      j--;
    } else {
      i--;
      j--;
      state = step === 4 ? 'H' : 'V';
    }
    j = Math.max(0, j);
    if (i < 0) break;
  }
  i = Math.max(0, placedFrom);
  // unmatched ends continue at the tempo of the matched path next to them
  const startRow = i;
  const reach = Math.min(EXTRAPOLATE_FRAMES, endRow - startRow);
  const headSlope = reach > 0 ? (at[startRow + reach] - at[startRow]) / reach : 1;
  const tailSlope = reach > 0 ? (at[endRow] - at[endRow - reach]) / reach : 1;
  for (let k = startRow - 1; k >= 0; k--) at[k] = at[k + 1] - headSlope;
  for (let k = endRow + 1; k < n; k++) at[k] = at[k - 1] + tailSlope;
  return { at, meanCost: sum / cells };
}
