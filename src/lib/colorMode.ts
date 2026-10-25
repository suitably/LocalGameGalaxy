import { STORAGE_KEYS, storage } from './storage';

/** The user's colour mode setting (DESIGN.md §9). `system` follows `prefers-color-scheme`. */
export type ColorModePreference = 'system' | 'dark' | 'light';

export const COLOR_MODE_PREFERENCES: readonly ColorModePreference[] = ['system', 'dark', 'light'];

export const DEFAULT_COLOR_MODE: ColorModePreference = 'system';

export function parseColorModePreference(raw: string | null | undefined): ColorModePreference {
  return COLOR_MODE_PREFERENCES.includes(raw as ColorModePreference)
    ? (raw as ColorModePreference)
    : DEFAULT_COLOR_MODE;
}

export function loadColorModePreference(): ColorModePreference {
  return parseColorModePreference(storage.get(STORAGE_KEYS.COLOR_MODE));
}

export function saveColorModePreference(preference: ColorModePreference): void {
  storage.set(STORAGE_KEYS.COLOR_MODE, preference);
}
