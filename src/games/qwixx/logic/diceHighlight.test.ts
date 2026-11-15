import { describe, it, expect } from 'vitest';
import { getRemovedDieColors } from './diceHighlight';
import type { PlayerSheet, QwixxSheetType, RowColor } from './types';

const makeSheet = (sheetType: QwixxSheetType, locked: RowColor[]): PlayerSheet => {
  const row = (color: RowColor) => ({ crossed: [], isLocked: locked.includes(color) });
  return {
    id: 'p1',
    name: 'P1',
    sheetType,
    presetIndex: 0,
    red: row('red'),
    yellow: row('yellow'),
    green: row('green'),
    blue: row('blue'),
    misses: 0,
  };
};

describe('getRemovedDieColors', () => {
  it('removes no die while no row is locked', () => {
    expect(getRemovedDieColors(makeSheet('classic', []))).toEqual([]);
  });

  it('removes the die of the locked row on the classic sheet', () => {
    expect(getRemovedDieColors(makeSheet('classic', ['green'])).sort()).toEqual(['green']);
    expect(getRemovedDieColors(makeSheet('classic', ['red', 'blue'])).sort()).toEqual([
      'blue',
      'red',
    ]);
  });

  it("uses the row's lock color on Gemixxt sheets", () => {
    // Gemixxt A, block 1: the first (red) row ends with a blue lock.
    expect(getRemovedDieColors(makeSheet('gemixxt_a', ['red']))).toEqual(['blue']);
  });
});
