import { describe, expect, it } from 'vitest';
import { buildRowSegments, isCellClickable, splitSegmentsIntoLines } from './rowLayout';
import type { SheetCell, SheetRowDefinition } from './types';

const cell = (number: number, color: SheetCell['color'], extra: Partial<SheetCell> = {}) => ({
  number,
  color,
  ...extra,
});

const row = (cells: SheetCell[]): SheetRowDefinition => ({
  id: 'red',
  defaultColor: 'red',
  cells,
  lockNumber: cells[cells.length - 1].number,
  lockColor: 'red',
});

describe('buildRowSegments', () => {
  it('returns no segments for an empty row', () => {
    expect(buildRowSegments({ ...row([cell(2, 'red')]), cells: [] })).toEqual([]);
  });

  it('keeps one segment for a single-colour row and flags it as last', () => {
    const segments = buildRowSegments(row([cell(2, 'red'), cell(3, 'red')]));
    expect(segments).toHaveLength(1);
    expect(segments[0].cells).toHaveLength(2);
    expect(segments[0].isLastSegment).toBe(true);
  });

  it('splits on colour changes and flags only the final segment', () => {
    const segments = buildRowSegments(
      row([cell(2, 'red'), cell(3, 'yellow'), cell(4, 'yellow'), cell(5, 'red')]),
    );
    expect(segments.map((s) => [s.color, s.cells.length, s.isLastSegment])).toEqual([
      ['red', 1, false],
      ['yellow', 2, false],
      ['red', 1, true],
    ]);
  });
});

describe('isCellClickable', () => {
  const numbers = [2, 3, 4, 5];

  it('allows crossing an open number and blocks numbers left of a crossed one', () => {
    const state = { crossed: [4], isLocked: false };
    expect(isCellClickable(cell(5, 'red'), numbers, state)).toBe(true);
    expect(isCellClickable(cell(3, 'red'), numbers, state)).toBe(false);
  });

  it('only lets the right-most crossed number be uncrossed', () => {
    const state = { crossed: [2, 4], isLocked: false };
    expect(isCellClickable(cell(4, 'red'), numbers, state)).toBe(true);
    expect(isCellClickable(cell(2, 'red'), numbers, state)).toBe(false);
  });

  it('keeps crossed sub-box cells tappable', () => {
    const state = { crossed: [2, 4], isLocked: false };
    expect(isCellClickable(cell(2, 'red', { hasSubBox: true }), numbers, state)).toBe(true);
  });
});

describe('splitSegmentsIntoLines', () => {
  const nums = (n: number, color: SheetCell['color'], from = 2) =>
    Array.from({ length: n }, (_, i) => cell(from + i, color));

  it('splits an 11-cell row into 6 + 5 and marks the lock on the second line', () => {
    const lines = splitSegmentsIntoLines(buildRowSegments(row(nums(11, 'red'))));
    expect(lines.map((l) => l.reduce((n, s) => n + s.cells.length, 0))).toEqual([6, 5]);
    expect(lines[0][0].isLastSegment).toBe(false);
    expect(lines[1][0].isLastSegment).toBe(true);
  });

  it('cuts a multi-colour segment at the split and keeps cell order', () => {
    const cells = [...nums(4, 'red'), ...nums(4, 'yellow', 6), ...nums(3, 'green', 10)];
    const lines = splitSegmentsIntoLines(buildRowSegments(row(cells)));
    expect(lines[0].map((s) => [s.color, s.cells.length])).toEqual([
      ['red', 4],
      ['yellow', 2],
    ]);
    expect(lines[1].map((s) => [s.color, s.cells.length])).toEqual([
      ['yellow', 2],
      ['green', 3],
    ]);
    expect(lines[1][1].isLastSegment).toBe(true);
  });

  it('keeps a short row on one line', () => {
    expect(splitSegmentsIntoLines(buildRowSegments(row(nums(1, 'red'))))).toHaveLength(1);
  });
});
