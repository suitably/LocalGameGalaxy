/**
 * How a judgement looks on the canvas: a shape per kind and a colour palette (#699)
 * [ID: GAME-MELODIQ-NOTES-JUDGEMENT-STYLE]
 *
 * Every judgement word carries its own glyph, so the kinds stay apart by shape alone (colour-blind
 * players, glare on a TV). The colour-blind palette (Okabe & Ito, `colorBlindPalette`) is an
 * opt-in setting of this device, read once and cached for the render loop.
 */
import { colorBlindPalette, darkTokens } from '../../../../themeTokens';
import { storage, STORAGE_KEYS } from '../../../../lib/storage';

export type JudgementPalette = 'standard' | 'colorblind';
/** What the canvas shows a word for: the four judgements and a wrong note. */
export type ShownJudgement = 'perfect' | 'good' | 'miss' | 'learn' | 'wrong';

export interface JudgementColors {
  perfect: string;
  good: string;
  miss: string;
  /** A played note in the notation view (perfect or good). */
  hit: string;
}

export const JUDGEMENT_PALETTES: Record<JudgementPalette, JudgementColors> = {
  standard: {
    perfect: darkTokens.primary.main,
    good: darkTokens.accent.main,
    miss: darkTokens.error,
    hit: darkTokens.success,
  },
  colorblind: {
    perfect: colorBlindPalette.skyBlue,
    good: colorBlindPalette.yellow,
    miss: colorBlindPalette.vermillion,
    hit: colorBlindPalette.skyBlue,
  },
};

/** One distinct shape per judgement; a miss and a wrong note differ too. */
export const JUDGEMENT_GLYPHS: Record<ShownJudgement, string> = {
  perfect: '★',
  good: '●',
  learn: '✓',
  miss: '✕',
  wrong: '▲',
};

/** The word the canvas shows, led by the judgement's glyph. */
export const judgementLabel = (kind: ShownJudgement, word: string) =>
  `${JUDGEMENT_GLYPHS[kind]} ${word}`;

export const parseJudgementPalette = (raw: string | null): JudgementPalette =>
  raw === 'colorblind' ? 'colorblind' : 'standard';

let cached: JudgementPalette | null = null;

export function getJudgementPalette(): JudgementPalette {
  cached ??= parseJudgementPalette(storage.get(STORAGE_KEYS.MELODIQ_NOTES_JUDGEMENT_PALETTE));
  return cached;
}

export function setJudgementPalette(palette: JudgementPalette) {
  cached = palette;
  storage.set(STORAGE_KEYS.MELODIQ_NOTES_JUDGEMENT_PALETTE, palette);
}

/** Colours of this device's chosen palette. */
export const judgementColors = (): JudgementColors => JUDGEMENT_PALETTES[getJudgementPalette()];

/** Forgets the cached choice (tests). */
export const resetJudgementPaletteCache = () => {
  cached = null;
};
