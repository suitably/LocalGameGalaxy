import { describe, expect, it } from 'vitest';
import { isPhoneSinging } from './phoneSinging';

describe('isPhoneSinging', () => {
  it('is unknown without a player list or device id', () => {
    expect(isPhoneSinging(undefined, 'dev-1')).toBeNull();
    expect(isPhoneSinging([], '')).toBeNull();
  });

  it('is true for a session player whose pitch is shown', () => {
    expect(isPhoneSinging([{ config: { deviceId: 'dev-1' } }], 'dev-1')).toBe(true);
    expect(isPhoneSinging([{ deviceId: 'dev-1' }], 'dev-1')).toBe(true);
  });

  it('is false for a spectator (hidden pitch) and for a phone outside the session', () => {
    expect(isPhoneSinging([{ config: { deviceId: 'dev-1', hidePitch: true } }], 'dev-1')).toBe(
      false,
    );
    expect(isPhoneSinging([{ config: { deviceId: 'dev-2' } }], 'dev-1')).toBe(false);
  });
});
