import type { Note } from '../../parser';

/**
 * Preferred screen rows per lyric line: 1 shrinks a line to stay whole, 2 wraps it at a space and
 * keeps the text larger. Either way a line too long for the minimum size wraps further.
 */
export type LyricsRows = 1 | 2;

/** Active line font size per breakpoint at scale 1. */
export const ACTIVE_LINE_REM = { xs: 1.35, md: 1.75, lg: 2.25 } as const;

/** Choosable smallest font factors: below it a line wraps instead of shrinking further. */
export const LYRICS_MIN_FIT_OPTIONS = [0.4, 0.6, 0.8, 1] as const;

/** Default smallest font factor: about 32px on a 1080p TV. */
export const DEFAULT_LYRICS_MIN_FIT = 0.6;

/** Keeps a little room so rounding and the words' trailing spaces cannot force an extra row. */
const LANE_SLACK = 0.98;

/** Width of `text` in em (at a font size of 1). */
export type MeasureEm = (text: string) => number;

/** Widest row (em) of a line in its best split into `rows` rows. Only spaces can break. */
export function widestRowEm(text: string, rows: LyricsRows, measure: MeasureEm): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const whole = measure(words.join(' '));
  if (rows === 1 || words.length === 1) return whole;

  let best = whole;
  for (let i = 1; i < words.length; i += 1) {
    const widest = Math.max(
      measure(words.slice(0, i).join(' ')),
      measure(words.slice(i).join(' ')),
    );
    best = Math.min(best, widest);
  }
  return best;
}

/** Widest row (em) over all lines of a song. */
export function songWidestRowEm(lines: string[], rows: LyricsRows, measure: MeasureEm): number {
  return lines.reduce((widest, line) => Math.max(widest, widestRowEm(line, rows, measure)), 0);
}

/** Font factor (≤ 1) at which a row of `widestEm` fits `laneWidthPx`. Unmeasured sizes keep 1. */
export function lyricsFitFactor(
  widestEm: number,
  laneWidthPx: number,
  fontPx: number,
  minFit: number = DEFAULT_LYRICS_MIN_FIT,
): number {
  if (widestEm <= 0 || laneWidthPx <= 0 || fontPx <= 0) return 1;
  const fit = (laneWidthPx * LANE_SLACK) / (widestEm * fontPx);
  return Math.max(minFit, Math.min(1, fit));
}

/**
 * Groups a line's syllables into words, which the UI keeps unbroken: a word ends at a syllable
 * with a trailing space or before one with a leading space.
 */
export function groupNotesIntoWords(notes: Note[]): Note[][] {
  const words: Note[][] = [];
  let word: Note[] = [];
  const flush = () => {
    if (word.length > 0) words.push(word);
    word = [];
  };
  for (const note of notes) {
    if (/^\s/.test(note.text)) flush();
    word.push(note);
    if (/\s$/.test(note.text)) flush();
  }
  flush();
  return words;
}
