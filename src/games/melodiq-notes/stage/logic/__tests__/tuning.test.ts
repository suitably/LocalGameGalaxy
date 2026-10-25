import { describe, expect, it } from 'vitest';
import { formatOffsetMs, nudgeOffset, OFFSET_RANGE_SEC, snapSpeed } from '../tuning';

describe('snapSpeed', () => {
  it('clamps to 25–150 %', () => {
    expect(snapSpeed(0.1)).toBe(0.25);
    expect(snapSpeed(3)).toBe(1.5);
  });
  it('snaps to 5 % steps without float drift', () => {
    expect(snapSpeed(0.72)).toBe(0.7);
    expect(snapSpeed(0.7000001)).toBe(0.7);
    expect(snapSpeed(1)).toBe(1);
  });
  it('falls back to 100 % for NaN', () => {
    expect(snapSpeed(NaN)).toBe(1);
  });
});

describe('nudgeOffset', () => {
  it('moves in 1 ms steps without float drift', () => {
    let o = 0;
    for (let i = 0; i < 3; i++) o = nudgeOffset(o, 0.001);
    expect(o).toBe(0.003);
    expect(nudgeOffset(0.05, -0.01)).toBe(0.04);
  });
  it('is limited to the slider range', () => {
    expect(nudgeOffset(OFFSET_RANGE_SEC, 0.5)).toBe(OFFSET_RANGE_SEC);
    expect(nudgeOffset(-OFFSET_RANGE_SEC, -0.5)).toBe(-OFFSET_RANGE_SEC);
  });
});

describe('formatOffsetMs', () => {
  it('formats signed milliseconds', () => {
    expect(formatOffsetMs(0.0126)).toBe('+13 ms');
    expect(formatOffsetMs(-0.05)).toBe('-50 ms');
    expect(formatOffsetMs(0)).toBe('0 ms');
  });
});
