import { describe, expect, it } from 'vitest';
import type { Note } from '../../parser';
import {
  groupNotesIntoLines,
  leadInTiming,
  lyricsOnlyLineCount,
  upcomingLineOpacity,
  upcomingLinesAfter,
} from './lyricsLines';

const note = (start: number, duration: number, type: string = ':'): Note =>
  ({ start, duration, type, text: 'la', pitch: 0 }) as unknown as Note;

describe('groupNotesIntoLines', () => {
  it('splits on line breaks and computes bounds', () => {
    const lines = groupNotesIntoLines([note(0, 4), note(4, 4), note(8, 0, '-'), note(12, 4)]);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ startBeat: 0, endBeat: 8 });
    expect(lines[1]).toMatchObject({ startBeat: 12, endBeat: 16 });
  });

  it('ignores empty groups and trailing breaks', () => {
    expect(groupNotesIntoLines([note(0, 2, '-'), note(0, 2, '-')])).toEqual([]);
    expect(groupNotesIntoLines([note(0, 2), note(2, 0, '-')])).toHaveLength(1);
  });
});

describe('upcomingLinesAfter', () => {
  const lines = groupNotesIntoLines([
    note(0, 2),
    note(2, 0, '-'),
    note(4, 2),
    note(6, 0, '-'),
    note(8, 2),
  ]);

  it('returns following lines up to count', () => {
    expect(upcomingLinesAfter(lines, 0, 1)).toEqual([lines[1]]);
    expect(upcomingLinesAfter(lines, 0, 5)).toEqual([lines[1], lines[2]]);
  });

  it('returns nothing without an active line', () => {
    expect(upcomingLinesAfter(lines, -1, 2)).toEqual([]);
  });
});

describe('leadInTiming', () => {
  const lines = groupNotesIntoLines([note(8, 4), note(12, 0, '-'), note(20, 4)]);

  it('measures the first gap from the song start', () => {
    expect(leadInTiming(lines, 0, 4, 100)).toEqual({ timeUntilStartSec: 0.4, totalGapSec: 0.8 });
  });

  it('measures later gaps from the previous line end', () => {
    expect(leadInTiming(lines, 1, 12, 100)).toEqual({ timeUntilStartSec: 0.8, totalGapSec: 0.8 });
  });

  it('is zero without an active line', () => {
    expect(leadInTiming(lines, -1, 0, 100)).toEqual({ timeUntilStartSec: 0, totalGapSec: 0 });
  });
});

describe('lyricsOnlyLineCount', () => {
  it('shows more lines when only lyrics are on stage', () => {
    expect(lyricsOnlyLineCount(2, true, false)).toBe(5);
    expect(lyricsOnlyLineCount(2, true, true)).toBe(3);
    expect(lyricsOnlyLineCount(2, false, false)).toBe(3);
  });

  it('keeps hidden lyrics hidden and never lowers the setting', () => {
    expect(lyricsOnlyLineCount(0, true, false)).toBe(0);
    expect(lyricsOnlyLineCount(6, true, true)).toBe(6);
  });
});

describe('upcomingLineOpacity', () => {
  it('keeps the two-line fade and spreads longer lists', () => {
    expect(upcomingLineOpacity(0, 1)).toBeCloseTo(0.65);
    expect(upcomingLineOpacity(1, 2)).toBeCloseTo(0.4);
    expect(upcomingLineOpacity(3, 4)).toBeCloseTo(0.15);
    expect(upcomingLineOpacity(9, 4)).toBe(0.15);
  });
});
