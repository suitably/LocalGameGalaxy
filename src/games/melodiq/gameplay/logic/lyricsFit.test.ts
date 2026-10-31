import { describe, expect, it } from 'vitest';
import type { Note } from '../../parser';
import {
  groupNotesIntoWords,
  DEFAULT_LYRICS_MIN_FIT,
  lyricsFitFactor,
  songWidestRowEm,
  widestRowEm,
} from './lyricsFit';

/** One em per character. */
const measure = (text: string) => text.length;
const note = (text: string) => ({ type: ':', start: 0, duration: 1, pitch: 60, text }) as Note;

describe('widestRowEm', () => {
  it('keeps the whole line for one row', () => {
    expect(widestRowEm('aaaa bbbb cccc dddd', 1, measure)).toBe(19);
  });

  it('finds the most even split for two rows', () => {
    expect(widestRowEm('aaaa bbbb cccc dddd', 2, measure)).toBe(9);
  });

  it('uses a lopsided split when the words force it', () => {
    expect(widestRowEm('aaaaaaaaaaaaaaaa bb cc', 2, measure)).toBe(16);
  });

  it('cannot split a single word', () => {
    expect(widestRowEm('aaaaaaaa', 2, measure)).toBe(8);
  });

  it('ignores surrounding and repeated spaces', () => {
    expect(widestRowEm('  aa   bb ', 1, measure)).toBe(5);
  });

  it('is zero for an empty line', () => {
    expect(widestRowEm('   ', 2, measure)).toBe(0);
  });
});

describe('songWidestRowEm', () => {
  it('takes the widest line of the song', () => {
    expect(songWidestRowEm(['aa bb', 'aaaa bbbb', 'a'], 2, measure)).toBe(4);
  });

  it('is zero without lines', () => {
    expect(songWidestRowEm([], 1, measure)).toBe(0);
  });
});

describe('lyricsFitFactor', () => {
  it('stays at full size when the widest row fits', () => {
    expect(lyricsFitFactor(10, 1000, 54)).toBe(1);
  });

  it('shrinks to the lane width', () => {
    expect(lyricsFitFactor(20, 800, 54)).toBeCloseTo((800 * 0.98) / (20 * 54));
  });

  it('stops at the readable minimum', () => {
    expect(lyricsFitFactor(1000, 800, 54)).toBe(DEFAULT_LYRICS_MIN_FIT);
  });

  it('honours the chosen minimum', () => {
    expect(lyricsFitFactor(1000, 800, 54, 0.4)).toBe(0.4);
    expect(lyricsFitFactor(1000, 800, 54, 1)).toBe(1);
  });

  it('keeps full size until everything is measured', () => {
    expect(lyricsFitFactor(0, 800, 54)).toBe(1);
    expect(lyricsFitFactor(20, 0, 54)).toBe(1);
  });
});

describe('groupNotesIntoWords', () => {
  const texts = (notes: Note[]) =>
    groupNotesIntoWords(notes).map((word) => word.map((n) => n.text).join(''));

  it('keeps syllables of a word together (trailing spaces)', () => {
    expect(texts([note('shar'), note('pened '), note('with')])).toEqual(['sharpened ', 'with']);
  });

  it('splits before a leading space', () => {
    expect(texts([note('shar'), note('pened'), note(' with')])).toEqual(['sharpened', ' with']);
  });

  it('handles an empty line', () => {
    expect(groupNotesIntoWords([])).toEqual([]);
  });
});
