import { describe, expect, it } from 'vitest';
import {
  correctDrift,
  FOLLOWER_DRIFT_POLICY,
  smoothDrift,
  STEM_DRIFT_POLICY,
  VIDEO_DRIFT_POLICY,
} from './mediaDrift';

describe('correctDrift', () => {
  const idle = { kind: 'rate', rate: 1, direction: 0 };

  it('leaves offsets below the engage threshold alone', () => {
    expect(correctDrift(0.02, 1, STEM_DRIFT_POLICY)).toEqual(idle);
    expect(correctDrift(-0.02, 1, STEM_DRIFT_POLICY)).toEqual(idle);
  });

  it('speeds a follower that is behind up with one fixed rate', () => {
    expect(correctDrift(0.03, 1, STEM_DRIFT_POLICY)).toEqual({
      kind: 'rate',
      rate: 1.01,
      direction: 1,
    });
    expect(correctDrift(0.1, 1, STEM_DRIFT_POLICY)).toEqual({
      kind: 'rate',
      rate: 1.01,
      direction: 1,
    });
  });

  it('slows a follower that is ahead down', () => {
    expect(correctDrift(-0.03, 1, STEM_DRIFT_POLICY)).toEqual({
      kind: 'rate',
      rate: 0.99,
      direction: -1,
    });
  });

  it('keeps a running correction until the release threshold', () => {
    expect(correctDrift(0.01, 1, STEM_DRIFT_POLICY, 1)).toEqual({
      kind: 'rate',
      rate: 1.01,
      direction: 1,
    });
    expect(correctDrift(0.004, 1, STEM_DRIFT_POLICY, 1)).toEqual(idle);
  });

  it('stops a running correction that overshot instead of reversing it', () => {
    expect(correctDrift(-0.01, 1, STEM_DRIFT_POLICY, 1)).toEqual(idle);
  });

  it('seeks when the offset is too large to slew', () => {
    expect(correctDrift(0.2, 1, STEM_DRIFT_POLICY)).toEqual({ kind: 'seek' });
    expect(correctDrift(-0.3, 1, FOLLOWER_DRIFT_POLICY)).toEqual({ kind: 'seek' });
    expect(correctDrift(0.4, 1, VIDEO_DRIFT_POLICY).kind).toBe('rate');
  });

  it('scales with the master rate', () => {
    expect(correctDrift(0.03, 2, STEM_DRIFT_POLICY)).toEqual({
      kind: 'rate',
      rate: 2.02,
      direction: 1,
    });
  });

  it('keeps the base rate for a non-finite reading', () => {
    expect(correctDrift(Number.NaN, 1, STEM_DRIFT_POLICY, 1)).toEqual(idle);
  });

  it('fixes a 50 ms lag within 6 s with two rate changes', () => {
    let drift = 0.05;
    let direction: 0 | 1 | -1 = 0;
    let rate = 1;
    let changes = 0;
    const dt = 1 / 60;
    for (let i = 0; i < 6 * 60; i++) {
      const c = correctDrift(drift, 1, STEM_DRIFT_POLICY, direction);
      if (c.kind !== 'rate') throw new Error('unexpected seek');
      if (c.rate !== rate) changes++;
      rate = c.rate;
      direction = c.direction;
      drift -= (c.rate - 1) * dt;
    }
    expect(Math.abs(drift)).toBeLessThanOrEqual(STEM_DRIFT_POLICY.releaseSec);
    expect(changes).toBe(2);
  });

  it('does not react to read jitter around zero', () => {
    let direction: 0 | 1 | -1 = 0;
    for (let i = 0; i < 200; i++) {
      const c = correctDrift(i % 2 ? 0.012 : -0.012, 1, STEM_DRIFT_POLICY, direction);
      expect(c).toEqual(idle);
      if (c.kind === 'rate') direction = c.direction;
    }
  });
});

describe('smoothDrift', () => {
  it('starts with the first reading and then moves towards new ones', () => {
    expect(smoothDrift(null, 0.02)).toBe(0.02);
    expect(smoothDrift(0.02, 0.01, 0.5)).toBeCloseTo(0.015);
  });
});
