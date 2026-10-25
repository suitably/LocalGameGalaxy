import type { CSSProperties } from 'react';
import {
  createTheme,
  responsiveFontSizes,
  type PaletteOptions,
  type Theme,
  type ThemeOptions,
} from '@mui/material/styles';
import {
  darkTokens,
  lightTokens,
  fontFamilies,
  motion,
  piecePalette,
  type PiecePalette,
  type SchemeTokens,
} from './themeTokens';
import { TOUCH_TARGET, invisibleHitArea } from './lib/touchTarget';

declare module '@mui/material/styles' {
  /** `primary.text`: primary-coloured text and thin parts (DESIGN.md §2.2); yellow fails on paper. */
  interface PaletteColor {
    text?: string;
  }
  interface SimplePaletteColorOptions {
    text?: string;
  }
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

export type ColorScheme = 'dark' | 'light';

/** Tokens of the scheme a theme is currently rendering (DESIGN.md §2, §9). */
export const schemeTokens = (theme: Pick<Theme, 'palette'>): SchemeTokens =>
  theme.palette.mode === 'light' ? lightTokens : darkTokens;

const paletteFor = (mode: ColorScheme): PaletteOptions => {
  const t = mode === 'light' ? lightTokens : darkTokens;
  return {
    mode,
    primary: {
      main: t.primary.main,
      light: t.primary.hover,
      dark: t.primary.edge,
      text: t.primary.text,
      contrastText: t.primary.contrastText,
    },
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
  };
};

const display = { fontFamily: fontFamilies.display };

/** Colour for primary-coloured text on surfaces; `primary.main` stays the fill colour. */
export const primaryText = (theme: Pick<Theme, 'palette'>): string =>
  theme.palette.primary.text ?? theme.palette.primary.main;

const focusRing = (theme: Theme) => ({
  outline: `3px solid ${schemeTokens(theme).accent.main}`,
  outlineOffset: 2,
});

// "Game night on the couch" — see DESIGN.md. Overrides read the active scheme's tokens
// through `schemeTokens(theme)`, so one set serves dark and light (DESIGN.md §9).
const sharedOptions: Omit<ThemeOptions, 'palette' | 'colorSchemes'> = {
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
      styleOverrides: (theme) => ({ ':focus-visible': focusRing(theme) }),
    },
    MuiButtonBase: {
      styleOverrides: {
        root: ({ theme }) => ({ '&.Mui-focusVisible': focusRing(theme) }),
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 12, minHeight: TOUCH_TARGET },
        // Tactile "edge" under the main action (DESIGN.md §5)
        containedPrimary: ({ theme }) => {
          const t = schemeTokens(theme);
          return {
            boxShadow: `0 4px 0 ${t.primary.edge}`,
            '&:hover': { backgroundColor: t.primary.hover, boxShadow: `0 4px 0 ${t.primary.edge}` },
            '&:active': { transform: 'translateY(2px)', boxShadow: `0 2px 0 ${t.primary.edge}` },
            '&.Mui-disabled': { boxShadow: 'none' },
          };
        },
        // Yellow is unreadable on paper: primary-coloured text uses `primary.text` (DESIGN.md §2.2).
        textPrimary: ({ theme }) => ({ color: primaryText(theme) }),
        outlinedPrimary: ({ theme }) => ({ color: primaryText(theme) }),
        outlined: ({ theme }) => {
          const t = schemeTokens(theme);
          return { borderColor: t.border.subtle, '&:hover': { borderColor: t.border.strong } };
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: ({ theme }) => ({ color: primaryText(theme) }),
      },
    },
    MuiSvgIcon: {
      styleOverrides: { colorPrimary: ({ theme }) => ({ color: primaryText(theme) }) },
    },
    MuiTypography: {
      variants: [
        { props: { color: 'primary' }, style: ({ theme }) => ({ color: primaryText(theme) }) },
      ],
    },
    // Touch targets (DESIGN.md §4, #510): >= 48px for every interactive control.
    MuiIconButton: {
      styleOverrides: { root: { minWidth: TOUCH_TARGET, minHeight: TOUCH_TARGET } },
    },
    MuiToggleButton: {
      styleOverrides: { root: { minHeight: TOUCH_TARGET } },
      variants: [
        {
          props: { color: 'primary' },
          style: ({ theme }) => ({ '&.Mui-selected': { color: primaryText(theme) } }),
        },
      ],
    },
    MuiTab: {
      styleOverrides: {
        root: { minHeight: TOUCH_TARGET },
        textColorPrimary: ({ theme }) => ({ '&.Mui-selected': { color: primaryText(theme) } }),
      },
    },
    MuiCheckbox: {
      styleOverrides: { root: { padding: 12 }, sizeSmall: { padding: 14 } },
    },
    MuiRadio: {
      styleOverrides: { root: { padding: 12 }, sizeSmall: { padding: 14 } },
    },
    MuiSlider: {
      styleOverrides: {
        root: { paddingTop: 22, paddingBottom: 22 },
        sizeSmall: { paddingTop: 22, paddingBottom: 22 },
      },
    },
    MuiChip: {
      styleOverrides: {
        // Visual chip stays compact; an invisible overlay extends the hit area vertically.
        clickable: invisibleHitArea(TOUCH_TARGET, 'y'),
        deletable: invisibleHitArea(TOUCH_TARGET, 'y'),
        outlinedPrimary: ({ theme }) => ({ color: primaryText(theme) }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 20,
          backgroundImage: 'none',
          border: `1px solid ${schemeTokens(theme).border.subtle}`,
        }),
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({ borderRadius: 20, boxShadow: schemeTokens(theme).overlayShadow }),
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: ({ theme }) => ({ borderRadius: 12, boxShadow: schemeTokens(theme).overlayShadow }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 8 },
        input: { '&:not(textarea)': { boxSizing: 'border-box', minHeight: TOUCH_TARGET } },
        notchedOutline: ({ theme }) => ({ borderColor: schemeTokens(theme).border.strong }),
      },
    },
  },
};

/**
 * Unwrapped dark-only theme (no `colorSchemes`). `src/themeTv.ts` derives the TV variant
 * from it, so TV views stay dark whatever the app mode is (DESIGN.md §9).
 */
export const baseTheme = createTheme({ ...sharedOptions, palette: paletteFor('dark') });

const FONT_VARIANTS = [
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
] as const;

/**
 * App theme with dark and light `colorSchemes` (no CSS variables). The active scheme is
 * picked by `ColorModeProvider` from our own setting, never from MUI's mode storage.
 */
export const appTheme = responsiveFontSizes(
  createTheme({
    ...sharedOptions,
    defaultColorScheme: 'dark',
    colorSchemes: {
      dark: { palette: paletteFor('dark') },
      light: { palette: paletteFor('light') },
    },
  }),
  { variants: [...FONT_VARIANTS] },
);

/** Dark-only app theme for code rendered outside `ColorModeProvider` (tests). */
export default responsiveFontSizes(baseTheme, { variants: [...FONT_VARIANTS] });
