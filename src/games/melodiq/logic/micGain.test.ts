import { describe, expect, it } from 'vitest';
import { micGainFactor } from './clientProfile';

describe('micGainFactor', () => {
  it('defaults to unity gain when unset or invalid', () => {
    expect(micGainFactor(undefined)).toBe(1);
    expect(micGainFactor(Number.NaN)).toBe(1);
  });

  it('maps percent to a factor', () => {
    expect(micGainFactor(100)).toBe(1);
    expect(micGainFactor(150)).toBe(1.5);
    expect(micGainFactor(0)).toBe(0);
  });

  it('clamps to 0–200 %', () => {
    expect(micGainFactor(500)).toBe(2);
    expect(micGainFactor(-20)).toBe(0);
  });
});
