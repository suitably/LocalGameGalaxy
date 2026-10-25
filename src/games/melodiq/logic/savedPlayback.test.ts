import { describe, expect, it } from 'vitest';
import { parseSavedPlaybackTime } from './savedPlayback';

describe('parseSavedPlaybackTime', () => {
  it('returns the time for the matching song', () => {
    expect(parseSavedPlaybackTime({ id: 'a', time: 42.5 }, 'a')).toBe(42.5);
  });

  it('ignores other songs and invalid payloads', () => {
    expect(parseSavedPlaybackTime({ id: 'b', time: 42 }, 'a')).toBeNull();
    expect(parseSavedPlaybackTime({ id: 'a', time: 0 }, 'a')).toBeNull();
    expect(parseSavedPlaybackTime({ id: 'a', time: '5' }, 'a')).toBeNull();
    expect(parseSavedPlaybackTime({ id: 'a', time: NaN }, 'a')).toBeNull();
    expect(parseSavedPlaybackTime(null, 'a')).toBeNull();
    expect(parseSavedPlaybackTime('x', 'a')).toBeNull();
  });
});
