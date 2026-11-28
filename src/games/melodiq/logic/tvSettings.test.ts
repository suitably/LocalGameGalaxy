import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from '../hooks/settingsStorage';
import { mergeHostSettings } from './tvSettings';

describe('mergeHostSettings', () => {
  it('applies TV settings from the host', () => {
    const next = mergeHostSettings(DEFAULT_SETTINGS, {
      songVolume: 0.3,
      audioPlaybackMode: 'original',
      lyricsPosition: 'center',
    });
    expect(next.songVolume).toBe(0.3);
    expect(next.audioPlaybackMode).toBe('original');
    expect(next.lyricsPosition).toBe('center');
  });

  it('returns the same object when nothing changed, so the TV does not re-render', () => {
    const payload = {
      songVolume: DEFAULT_SETTINGS.songVolume,
      customLayouts: { 1: '1', 2: '1.1', 3: '1.2', 4: '2.2' },
    };
    expect(mergeHostSettings(DEFAULT_SETTINGS, payload)).toBe(DEFAULT_SETTINGS);
  });

  it('ignores host-only settings, unknown keys and wrong types', () => {
    const next = mergeHostSettings(DEFAULT_SETTINGS, {
      micLatency: 120,
      helperUrl: 'http://evil',
      bogus: 1,
      songVolume: 'loud',
    });
    expect(next).toBe(DEFAULT_SETTINGS);
  });

  it('ignores payloads that are not objects', () => {
    expect(mergeHostSettings(DEFAULT_SETTINGS, null)).toBe(DEFAULT_SETTINGS);
    expect(mergeHostSettings(DEFAULT_SETTINGS, 'x')).toBe(DEFAULT_SETTINGS);
  });
});
