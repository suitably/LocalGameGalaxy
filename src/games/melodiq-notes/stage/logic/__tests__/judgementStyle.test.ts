import { beforeEach, describe, expect, it } from 'vitest';
import { storage, STORAGE_KEYS } from '../../../../../lib/storage';
import { colorBlindPalette } from '../../../../../themeTokens';
import {
  getJudgementPalette,
  JUDGEMENT_GLYPHS,
  JUDGEMENT_PALETTES,
  judgementColors,
  judgementLabel,
  parseJudgementPalette,
  resetJudgementPaletteCache,
  setJudgementPalette,
} from '../judgementStyle';

describe('judgement style', () => {
  beforeEach(() => {
    storage.remove(STORAGE_KEYS.MELODIQ_NOTES_JUDGEMENT_PALETTE);
    resetJudgementPaletteCache();
  });

  it('gives every judgement its own glyph', () => {
    const glyphs = Object.values(JUDGEMENT_GLYPHS);
    expect(new Set(glyphs).size).toBe(glyphs.length);
    expect(judgementLabel('miss', 'Miss')).toBe(`${JUDGEMENT_GLYPHS.miss} Miss`);
  });

  it('keeps perfect, good and miss apart in both palettes', () => {
    for (const colors of Object.values(JUDGEMENT_PALETTES)) {
      const shown = [colors.perfect, colors.good, colors.miss];
      expect(new Set(shown).size).toBe(3);
      expect(colors.hit).not.toBe(colors.miss);
    }
    expect(Object.values(colorBlindPalette)).toEqual(
      expect.arrayContaining(Object.values(JUDGEMENT_PALETTES.colorblind)),
    );
  });

  it('reads unknown stored values as the standard palette', () => {
    expect(parseJudgementPalette('colorblind')).toBe('colorblind');
    expect(parseJudgementPalette('')).toBe('standard');
    expect(parseJudgementPalette(null)).toBe('standard');
    expect(parseJudgementPalette('neon')).toBe('standard');
  });

  it('stores the choice and serves its colours', () => {
    expect(getJudgementPalette()).toBe('standard');
    setJudgementPalette('colorblind');
    expect(judgementColors()).toBe(JUDGEMENT_PALETTES.colorblind);
    resetJudgementPaletteCache();
    expect(getJudgementPalette()).toBe('colorblind');
  });
});
