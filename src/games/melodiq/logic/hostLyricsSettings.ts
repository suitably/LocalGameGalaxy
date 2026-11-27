import type { PassiveGameState } from '../types';
import type { SettingsState } from '../hooks/settingsStorage';

type LyricsDisplaySettings = Pick<
  SettingsState,
  'lyricsScale' | 'enableLyricsZoom' | 'lyricsLines' | 'lyricsPosition'
>;

/** Adds the host's lyrics display settings to a game state bound for a passive TV. */
export function withHostLyricsSettings<T extends Partial<PassiveGameState>>(
  state: T,
  settings: LyricsDisplaySettings,
): T {
  return {
    ...state,
    lyricsScale: settings.lyricsScale ?? 1.0,
    enableLyricsZoom: settings.enableLyricsZoom ?? false,
    lyricsLines: settings.lyricsLines ?? 2,
    lyricsPosition: settings.lyricsPosition ?? 'bottom',
  };
}
