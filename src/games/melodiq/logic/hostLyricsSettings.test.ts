import { describe, expect, it } from 'vitest';
import { withHostLyricsSettings } from './hostLyricsSettings';

describe('withHostLyricsSettings', () => {
  it('adds the host lyrics settings and keeps the game state', () => {
    const state = { isPlaying: true, currentTime: 12 };
    const out = withHostLyricsSettings(state, {
      lyricsScale: 1.5,
      enableLyricsZoom: true,
      lyricsLines: 3,
      lyricsPosition: 'center',
    });
    expect(out).toEqual({
      isPlaying: true,
      currentTime: 12,
      lyricsScale: 1.5,
      enableLyricsZoom: true,
      lyricsLines: 3,
      lyricsPosition: 'center',
    });
    expect(state).toEqual({ isPlaying: true, currentTime: 12 });
  });

  it('overrides stale values already in the state', () => {
    const out = withHostLyricsSettings(
      { lyricsPosition: 'bottom' as const },
      { lyricsScale: 1, enableLyricsZoom: false, lyricsLines: 2, lyricsPosition: 'center' },
    );
    expect(out.lyricsPosition).toBe('center');
  });
});
