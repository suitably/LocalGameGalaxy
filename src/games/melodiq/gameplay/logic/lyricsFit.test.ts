import { describe, expect, it } from 'vitest';
import { fitFactor, MIN_LYRICS_FIT } from './lyricsFit';

describe('fitFactor', () => {
  it('keeps full size when the line fits', () => {
    expect(fitFactor(1400, 900, 1)).toBe(1);
  });

  it('shrinks an overflowing line to the container width', () => {
    expect(fitFactor(1400, 1750, 1)).toBeCloseTo(0.8);
  });

  it('measures the natural width relative to the applied factor', () => {
    // Measured 700px at factor 0.5 → natural 1400px → fits 1400px at full size.
    expect(fitFactor(1400, 700, 0.5)).toBe(1);
    // Measured 800px at factor 0.5 → natural 1600px → 0.875.
    expect(fitFactor(1400, 800, 0.5)).toBeCloseTo(0.875);
  });

  it('ignores sub-pixel overflow', () => {
    expect(fitFactor(1400, 1400.6, 1)).toBe(1);
  });

  it('never shrinks below the minimum factor', () => {
    expect(fitFactor(100, 5000, 1)).toBe(MIN_LYRICS_FIT);
  });

  it('keeps the current factor while sizes are unmeasured', () => {
    expect(fitFactor(0, 900, 0.7)).toBe(0.7);
    expect(fitFactor(1400, 0, 0.7)).toBe(0.7);
  });
});
