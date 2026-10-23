import { createTheme, responsiveFontSizes } from '@mui/material/styles';
import { darkTokens as t, fontFamilies, piecePalette, type PiecePalette } from './themeTokens';

declare module '@mui/material/styles' {
  interface Palette {
    piece: PiecePalette;
  }
  interface PaletteOptions {
    piece?: PiecePalette;
  }
}

const display = { fontFamily: fontFamilies.display };

// "Game night on the couch" — see DESIGN.md. Dark only until the mode setting exists (DESIGN.md §10).
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: t.primary.main, dark: t.primary.edge, contrastText: t.primary.contrastText },
    secondary: { main: t.accent.main, contrastText: t.accent.contrastText },
    info: { main: t.accent.main, contrastText: t.accent.contrastText },
    success: { main: t.success, contrastText: t.onStatus },
    warning: { main: t.warning, contrastText: t.onStatus },
    error: { main: t.error, contrastText: t.onStatus },
    background: { default: t.bg.canvas, paper: t.bg.surface },
    text: { primary: t.text.primary, secondary: t.text.secondary, disabled: t.text.disabled },
    divider: t.border.subtle,
    action: { disabledBackground: t.bg.raised, disabled: t.text.disabled },
    piece: piecePalette,
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: fontFamilies.text,
    h1: { ...display, fontSize: '2.5rem', lineHeight: 1.1, fontWeight: 750 },
    h2: { ...display, fontSize: '2rem', lineHeight: 1.15, fontWeight: 700 },
    h3: { ...display, fontSize: '1.75rem', lineHeight: 1.2, fontWeight: 700 },
    h4: { ...display, fontSize: '1.5rem', lineHeight: 1.25, fontWeight: 700 },
    h5: { fontSize: '1.25rem', lineHeight: 1.3, fontWeight: 650 },
    h6: { fontSize: '1.1rem', lineHeight: 1.3, fontWeight: 650 },
    subtitle1: { fontSize: '1rem', lineHeight: 1.5, fontWeight: 600 },
    subtitle2: { fontSize: '0.875rem', lineHeight: 1.45, fontWeight: 600 },
    body1: { lineHeight: 1.5 },
    body2: { lineHeight: 1.45 },
    button: { fontWeight: 600, textTransform: 'none' },
    caption: { lineHeight: 1.35, fontWeight: 600, letterSpacing: '0.02em' },
    overline: { lineHeight: 1.35, fontWeight: 600, letterSpacing: '0.02em', textTransform: 'none' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':focus-visible': { outline: `3px solid ${t.accent.main}`, outlineOffset: 2 },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&.Mui-focusVisible': { outline: `3px solid ${t.accent.main}`, outlineOffset: 2 },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 12 },
        // Tactile "edge" under the main action (DESIGN.md §5)
        containedPrimary: {
          boxShadow: `0 4px 0 ${t.primary.edge}`,
          '&:hover': { backgroundColor: t.primary.hover, boxShadow: `0 4px 0 ${t.primary.edge}` },
          '&:active': { transform: 'translateY(2px)', boxShadow: `0 2px 0 ${t.primary.edge}` },
          '&.Mui-disabled': { boxShadow: 'none' },
        },
        outlined: { borderColor: t.border.subtle, '&:hover': { borderColor: t.border.strong } },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 20, backgroundImage: 'none', border: `1px solid ${t.border.subtle}` },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 20, boxShadow: t.overlayShadow } },
    },
    MuiPopover: {
      styleOverrides: { paper: { borderRadius: 12, boxShadow: t.overlayShadow } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 8 },
        notchedOutline: { borderColor: t.border.strong },
      },
    },
  },
});

export default responsiveFontSizes(theme);
