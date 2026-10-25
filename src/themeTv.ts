import { createTheme, type Theme } from '@mui/material/styles';
import { baseTheme } from './theme';

// TV mode (DESIGN.md §3.3, §4, §9): 1080p+, ~3 m away. Type x1.5, nothing under 20px,
// 48px page gutter, 32px icons, always dark.
export const TV_TYPE_SCALE = 1.5;
export const TV_MIN_FONT_PX = 20;
export const TV_GUTTER_PX = 48;
export const TV_ICON_PX = 32;

const ROOT_PX = 16;

export const TV_VARIANTS = [
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
  'button',
  'caption',
  'overline',
] as const;

type TvVariant = (typeof TV_VARIANTS)[number];

/** Parses `"1.5rem"` / `"24px"` / a number of px; falls back to the root size. */
function toPx(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    if (Number.isFinite(n)) return value.endsWith('px') ? n : n * ROOT_PX;
  }
  return ROOT_PX;
}

/** Font size (px) for one variant on TV: base x 1.5, never below 20px. */
export function tvFontSizePx(basePx: number): number {
  return Math.max(TV_MIN_FONT_PX, basePx * TV_TYPE_SCALE);
}

/**
 * TV variant of the app theme. Built from the unwrapped dark base theme with explicit
 * sizes (no `responsiveFontSizes`, which would shrink type on a narrow window), so the
 * result is always dark and the same at every width.
 */
export function createTvTheme(base: Theme = baseTheme): Theme {
  const variants = base.typography as unknown as Record<TvVariant, { fontSize?: unknown }>;
  const typography: Record<string, { fontSize: string }> = {};
  for (const variant of TV_VARIANTS) {
    const px = tvFontSizePx(toPx(variants[variant]?.fontSize));
    typography[variant] = { fontSize: `${px / ROOT_PX}rem` };
  }
  const iconSize = `${TV_ICON_PX / ROOT_PX}rem`;
  return createTheme(base, {
    palette: { mode: 'dark' },
    typography,
    components: {
      MuiContainer: {
        styleOverrides: {
          root: { paddingLeft: TV_GUTTER_PX, paddingRight: TV_GUTTER_PX },
        },
      },
      MuiSvgIcon: {
        styleOverrides: {
          fontSizeSmall: { fontSize: iconSize },
          fontSizeMedium: { fontSize: iconSize },
          fontSizeLarge: { fontSize: `${(TV_ICON_PX * 1.5) / ROOT_PX}rem` },
        },
      },
      MuiChip: {
        styleOverrides: { label: { fontSize: `${TV_MIN_FONT_PX / ROOT_PX}rem` } },
      },
    },
  });
}

export const tvTheme = createTvTheme();
