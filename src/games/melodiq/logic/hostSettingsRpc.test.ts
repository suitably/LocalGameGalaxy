import { describe, expect, it } from 'vitest';
import {
  canEditHostSettings,
  parseHostSettingsRpc,
  pickHostSettings,
  sanitizeHostSettingsPatch,
} from './hostSettingsRpc';
import { DEFAULT_SETTINGS } from '../hooks/settingsStorage';

describe('sanitizeHostSettingsPatch', () => {
  it('keeps valid values and clamps ranges', () => {
    expect(
      sanitizeHostSettingsPatch({
        songVolume: 1.7,
        vocalsVolume: -2,
        lyricsScale: 9,
        lyricsLines: 3,
      }),
    ).toEqual({ songVolume: 1, vocalsVolume: 0, lyricsScale: 3, lyricsLines: 3 });
  });

  it('drops unknown keys and invalid values', () => {
    expect(
      sanitizeHostSettingsPatch({
        helperUrl: 'http://evil',
        audioPlaybackMode: 'x',
        lyricsPosition: 'center',
        lyricsLines: 1.5,
        showNoteLabels: 'yes',
        masterVolume: NaN,
      }),
    ).toEqual({ lyricsPosition: 'center' });
  });

  it('returns an empty patch for non-objects', () => {
    expect(sanitizeHostSettingsPatch(null)).toEqual({});
    expect(sanitizeHostSettingsPatch('a')).toEqual({});
  });
});

describe('parseHostSettingsRpc', () => {
  it('parses get and set requests', () => {
    expect(parseHostSettingsRpc({ type: 'host.settings.get' })).toEqual({
      type: 'host.settings.get',
    });
    expect(
      parseHostSettingsRpc({
        type: 'host.settings.set',
        patch: { songVolume: 0.5, helperUrl: 'x' },
      }),
    ).toEqual({ type: 'host.settings.set', patch: { songVolume: 0.5 } });
  });

  it('ignores other messages', () => {
    expect(parseHostSettingsRpc({ type: 'queue.get' })).toBeNull();
    expect(parseHostSettingsRpc(undefined)).toBeNull();
  });
});

describe('host settings helpers', () => {
  it('picks only the editable keys', () => {
    const picked = pickHostSettings(DEFAULT_SETTINGS);
    expect(picked).not.toHaveProperty('helperUrl');
    expect(picked.songVolume).toBe(DEFAULT_SETTINGS.songVolume);
  });

  it('allows admins only', () => {
    expect(canEditHostSettings('admin')).toBe(true);
    expect(canEditHostSettings('queue_manager')).toBe(false);
    expect(canEditHostSettings(undefined)).toBe(false);
  });
});
