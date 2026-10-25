import type { CSSProperties } from 'react';
import { createTheme, responsiveFontSizes } from '@mui/material/styles';
import {
  darkTokens as t,
  fontFamilies,
  motion,
  piecePalette,
  type PiecePalette,
} from './themeTokens';
import { TOUCH_TARGET, invisibleHitArea } from './lib/touchTarget';

declare module '@mui/material/styles' {
  interface Palette {
    piece: PiecePalette;
  }
  interface PaletteOptions {
    piece?: PiecePalette;
  }
  interface TypographyVariants {
    display: CSSProperties;
  }
  interface TypographyVariantsOptions {
    display?: CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    display: true;
  }
}

const display = { fontFamily: fontFamilies.display };

// "Game night on the couch" — see DESIGN.md. Dark only until the mode setting exists (DESIGN.md §10).
/** Unwrapped dark theme; `src/themeTv.ts` derives the TV variant from it. */
export const baseTheme = createTheme({
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
  transitions: {
    duration: { short: motion.duration.short, standard: motion.duration.standard },
    easing: { easeInOut: motion.easing.standard, easeOut: motion.easing.standard },
  },
  typography: {
    fontFamily: fontFamilies.text,
    display: { ...display, fontSize: '3.5rem', lineHeight: 1.05, fontWeight: 800 },
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
        root: { borderRadius: 12, minHeight: TOUCH_TARGET },
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
    // Touch targets (DESIGN.md §4, #510): >= 48px for every interactive control.
    MuiIconButton: {
      styleOverrides: { root: { minWidth: TOUCH_TARGET, minHeight: TOUCH_TARGET } },
    },
    MuiToggleButton: {
      styleOverrides: { root: { minHeight: TOUCH_TARGET } },
    },
    MuiTab: {
      styleOverrides: { root: { minHeight: TOUCH_TARGET } },
    },
    MuiCheckbox: {
      styleOverrides: { root: { padding: 12 }, sizeSmall: { padding: 14 } },
    },
    MuiRadio: {
      styleOverrides: { root: { padding: 12 }, sizeSmall: { padding: 14 } },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          paddingTop: 22,
          paddingBottom: 22,
          boxSizing: 'border-box',
          minHeight: TOUCH_TARGET,
        },
        sizeSmall: {
          paddingTop: 22,
          paddingBottom: 22,
          boxSizing: 'border-box',
          minHeight: TOUCH_TARGET,
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        // The 38px thumb track stays; an invisible overlay extends the hit area to 48px.
        switchBase: {
          '&::after': {
            content: '""',
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: TOUCH_TARGET,
            height: TOUCH_TARGET,
            transform: 'translate(-50%, -50%)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        // Visual chip stays compact; an invisible overlay extends the hit area vertically.
        clickable: invisibleHitArea(TOUCH_TARGET, 'y'),
        deletable: invisibleHitArea(TOUCH_TARGET, 'y'),
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
        input: { '&:not(textarea)': { boxSizing: 'border-box', minHeight: TOUCH_TARGET } },
        notchedOutline: { borderColor: t.border.strong },
      },
    },
  },
});

export default responsiveFontSizes(baseTheme, {
  variants: [
    'display',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'subtitle1',
    'subtitle2',
    'body1',
    'body2',
    'caption',
    'button',
    'overline',
  ],
});
