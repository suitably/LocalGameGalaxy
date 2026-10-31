/** Smallest font factor a lyrics line is shrunk to; below this it stays cut off rather than unreadable. */
export const MIN_LYRICS_FIT = 0.35;

/** Tolerance (px) so sub-pixel rounding does not shrink a line that already fits. */
const FIT_SLACK_PX = 1;

/**
 * Font factor (0 < f ≤ 1) that makes a single-line lyric fit its container.
 * `contentWidth` is measured while `currentFactor` is applied; text width scales linearly with the
 * font size, so the natural width is `contentWidth / currentFactor`. Unmeasured sizes keep the current factor.
 */
export function fitFactor(
  availableWidth: number,
  contentWidth: number,
  currentFactor: number,
  minFactor = MIN_LYRICS_FIT,
): number {
  if (availableWidth <= 0 || contentWidth <= 0 || currentFactor <= 0) return currentFactor;
  const naturalWidth = contentWidth / currentFactor;
  if (naturalWidth <= availableWidth + FIT_SLACK_PX) return 1;
  return Math.max(minFactor, availableWidth / naturalWidth);
}
