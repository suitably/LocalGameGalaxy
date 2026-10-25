import { describe, expect, it } from 'vitest';
import { resolveInitialPlaybackTime } from './initialPlaybackTime';

describe('resolveInitialPlaybackTime', () => {
  it('is 0 without a selected song', () => {
    expect(resolveInitialPlaybackTime(null, { id: 'a', currentTime: 30 })).toBe(0);
  });

  it('prefers the selected song time', () => {
    expect(
      resolveInitialPlaybackTime({ id: 'a', currentTime: 12 }, { id: 'a', currentTime: 30 }),
    ).toBe(12);
  });

  it('uses the restored time only for the same song', () => {
    expect(resolveInitialPlaybackTime({ id: 'a' }, { id: 'a', currentTime: 30 })).toBe(30);
    expect(resolveInitialPlaybackTime({ id: 'a' }, { id: 'b', currentTime: 30 })).toBe(0);
  });

  it('ignores non-positive or non-numeric times', () => {
    expect(resolveInitialPlaybackTime({ id: 'a', currentTime: 0 }, null)).toBe(0);
    expect(resolveInitialPlaybackTime({ id: 'a', currentTime: '5' }, null)).toBe(0);
  });
});
