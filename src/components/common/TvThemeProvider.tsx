import type { ReactNode } from 'react';
import { GlobalStyles } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { tvTheme } from '../../themeTv';

const tvPageStyles = {
  // The app may be in light mode; TV is always dark (DESIGN.md §9), page background included.
  html: { colorScheme: 'dark' },
  body: {
    backgroundColor: tvTheme.palette.background.default,
    color: tvTheme.palette.text.primary,
  },
} as const;

/** Wraps every TV-mode view (DESIGN.md §3.3): x1.5 type, 32px icons, 48px gutters, dark. */
export function TvThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={tvTheme}>
      <GlobalStyles styles={tvPageStyles} />
      {children}
    </ThemeProvider>
  );
}
