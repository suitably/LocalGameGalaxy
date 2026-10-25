import type { ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { tvTheme } from '../../themeTv';

/** Wraps every TV-mode view (DESIGN.md §3.3): x1.5 type, 32px icons, 48px gutters, dark. */
export function TvThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={tvTheme}>{children}</ThemeProvider>;
}
