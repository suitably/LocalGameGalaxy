import { describe, expect, it } from 'vitest';
import { baseTheme } from './theme';
import {
  TV_GUTTER_PX,
  TV_ICON_PX,
  TV_MIN_FONT_PX,
  TV_VARIANTS,
  createTvTheme,
  tvFontSizePx,
} from './themeTv';

const px = (rem: unknown) => parseFloat(String(rem)) * 16;

describe('tvFontSizePx', () => {
  it('scales by 1.5', () => expect(tvFontSizePx(16)).toBe(24));
  it('never goes below 20px', () => expect(tvFontSizePx(12)).toBe(TV_MIN_FONT_PX));
});

describe('createTvTheme', () => {
  const theme = createTvTheme();

  it('is always dark', () => expect(theme.palette.mode).toBe('dark'));

  it('keeps the brand palette of the base theme', () => {
    expect(theme.palette.primary.main).toBe(baseTheme.palette.primary.main);
  });

  it('body is 24px and display is 5.25rem', () => {
    expect(px(theme.typography.body1.fontSize)).toBe(24);
    expect(theme.typography.display.fontSize).toBe('5.25rem');
  });

  it('has no variant under 20px', () => {
    for (const v of TV_VARIANTS) {
      const size = (theme.typography as unknown as Record<string, { fontSize: string }>)[v]
        .fontSize;
      expect(px(size)).toBeGreaterThanOrEqual(TV_MIN_FONT_PX);
    }
  });

  it('is not responsive: no media queries on headings', () => {
    const h1 = theme.typography.h1 as Record<string, unknown>;
    expect(Object.keys(h1).filter((k) => k.startsWith('@media'))).toEqual([]);
  });

  it('uses 32px icons and 48px container gutters', () => {
    const c = theme.components;
    expect(c?.MuiSvgIcon?.styleOverrides).toMatchObject({
      fontSizeMedium: { fontSize: `${TV_ICON_PX / 16}rem` },
    });
    expect(c?.MuiContainer?.styleOverrides?.root).toMatchObject({
      paddingLeft: TV_GUTTER_PX,
      paddingRight: TV_GUTTER_PX,
    });
  });
});
