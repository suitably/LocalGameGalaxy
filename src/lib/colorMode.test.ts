import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS, storage } from './storage';
import {
  DEFAULT_COLOR_MODE,
  loadColorModePreference,
  parseColorModePreference,
  saveColorModePreference,
} from './colorMode';
import type { Palette, Theme } from '@mui/material/styles';
import { appTheme, baseTheme } from '../theme';
import { darkTokens, lightTokens } from '../themeTokens';

describe('colour mode preference', () => {
  beforeEach(() => storage.remove(STORAGE_KEYS.COLOR_MODE));

  it('defaults to system', () => {
    expect(DEFAULT_COLOR_MODE).toBe('system');
    expect(loadColorModePreference()).toBe('system');
  });

  it('rejects unknown values', () => {
    expect(parseColorModePreference('sepia')).toBe('system');
    expect(parseColorModePreference(null)).toBe('system');
  });

  it('round-trips through our storage key, not MUI’s', () => {
    saveColorModePreference('light');
    expect(storage.get(STORAGE_KEYS.COLOR_MODE)).toBe('light');
    expect(storage.get('mui-mode', 'none')).toBe('none');
    expect(loadColorModePreference()).toBe('light');
  });
});

type Schemes = Partial<Record<'dark' | 'light', { palette: Palette }>>;
const schemesOf = (theme: Theme): Schemes =>
  (theme as Theme & { colorSchemes?: Schemes }).colorSchemes ?? {};

describe('app theme colour schemes', () => {
  it('builds dark and light palettes from the tokens', () => {
    const schemes = schemesOf(appTheme);
    expect(schemes.dark?.palette.background.default).toBe(darkTokens.bg.canvas);
    expect(schemes.light?.palette.background.default).toBe(lightTokens.bg.canvas);
    expect(schemes.light?.palette.secondary.main).toBe(lightTokens.accent.main);
  });

  it('keeps the TV base theme dark-only', () => {
    expect(baseTheme.palette.mode).toBe('dark');
    expect(schemesOf(baseTheme).light).toBeUndefined();
  });
});
