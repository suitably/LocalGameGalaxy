import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeProvider, useColorScheme, useTheme } from '@mui/material/styles';
import { appTheme } from '../theme';
import {
  loadColorModePreference,
  saveColorModePreference,
  type ColorModePreference,
} from '../lib/colorMode';
import { ColorModeContext } from './colorModeContext';

/** Pushes our setting into MUI and keeps `<meta name="theme-color">` on `bg.canvas`. */
function ColorModeSync({ preference }: { preference: ColorModePreference }) {
  const { mode, setMode } = useColorScheme();
  const canvas = useTheme().palette.background.default;

  useEffect(() => {
    if (mode !== preference) setMode(preference);
  }, [mode, preference, setMode]);

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', canvas);
  }, [canvas]);

  return null;
}

/**
 * App theme provider with dark and light colour schemes (DESIGN.md §9). The mode comes from
 * our own setting (`STORAGE_KEYS.COLOR_MODE`); MUI's `mui-mode` storage is disabled.
 * TV views override it with `TvThemeProvider` (always dark).
 */
export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ColorModePreference>(loadColorModePreference);

  const setPreference = useCallback((next: ColorModePreference) => {
    saveColorModePreference(next);
    setPreferenceState(next);
  }, []);

  const value = useMemo(() => ({ preference, setPreference }), [preference, setPreference]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider
        theme={appTheme}
        storageManager={null}
        defaultMode={preference}
        disableTransitionOnChange
      >
        <ColorModeSync preference={preference} />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
