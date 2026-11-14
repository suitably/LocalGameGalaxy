import { describe, expect, it } from 'vitest';
import {
  correctDrift,
  FOLLOWER_DRIFT_POLICY,
  smoothDrift,
  STEM_DRIFT_POLICY,
  VIDEO_DRIFT_POLICY,
} from './mediaDrift';

describe('correctDrift', () => {
  it('leaves offsets inside the deadband alone', () => {
    expect(correctDrift(0.001, 1, STEM_DRIFT_POLICY)).toEqual({ kind: 'rate', rate: 1 });
    expect(correctDrift(-0.001, 1, STEM_DRIFT_POLICY)).toEqual({ kind: 'rate', rate: 1 });
  });

  it('speeds a follower that is behind up, in proportion to the offset', () => {
    const small = correctDrift(0.01, 1, STEM_DRIFT_POLICY);
    const larger = correctDrift(0.02, 1, STEM_DRIFT_POLICY);
    expect(small).toEqual({ kind: 'rate', rate: 1.005 });
    expect(larger).toEqual({ kind: 'rate', rate: 1.01 });
  });

  it('slows a follower that is ahead down', () => {
    expect(correctDrift(-0.01, 1, STEM_DRIFT_POLICY)).toEqual({ kind: 'rate', rate: 0.995 });
  });

  it('corrects the 11.6 ms rest offset the old 20 ms threshold kept forever', () => {
    const c = correctDrift(-0.0116, 1, STEM_DRIFT_POLICY);
    expect(c.kind).toBe('rate');
    expect(c.kind === 'rate' && c.rate).toBeLessThan(1);
  });

  it('caps the rate change', () => {
    expect(correctDrift(0.05, 1, STEM_DRIFT_POLICY)).toEqual({ kind: 'rate', rate: 1.015 });
    expect(correctDrift(0.4, 1, VIDEO_DRIFT_POLICY)).toEqual({ kind: 'rate', rate: 1.05 });
  });

  it('seeks when the offset is too large to slew', () => {
    expect(correctDrift(0.09, 1, STEM_DRIFT_POLICY)).toEqual({ kind: 'seek' });
    expect(correctDrift(-0.2, 1, FOLLOWER_DRIFT_POLICY)).toEqual({ kind: 'seek' });
  });

  it('scales with the master rate', () => {
    expect(correctDrift(0.01, 2, STEM_DRIFT_POLICY)).toEqual({ kind: 'rate', rate: 2.01 });
  });

  it('keeps the base rate for a non-finite reading', () => {
    expect(correctDrift(Number.NaN, 1, STEM_DRIFT_POLICY)).toEqual({ kind: 'rate', rate: 1 });
  });

  it('converges: a 50 ms lag is below 3 ms after 8 s', () => {
    let drift = 0.05;
    const dt = 1 / 60;
    for (let i = 0; i < 8 * 60; i++) {
      const c = correctDrift(drift, 1, STEM_DRIFT_POLICY);
      if (c.kind === 'rate') drift -= (c.rate - 1) * dt;
    }
    expect(Math.abs(drift)).toBeLessThan(0.003);
  });
});

describe('smoothDrift', () => {
  it('starts with the first reading and then moves towards new ones', () => {
    expect(smoothDrift(null, 0.02)).toBe(0.02);
    expect(smoothDrift(0.02, 0.01, 0.5)).toBeCloseTo(0.015);
  });
});
