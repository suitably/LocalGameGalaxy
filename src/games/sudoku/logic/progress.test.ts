import { describe, it, expect } from 'vitest';
import { hasSudokuProgress } from './progress';
import type { SudokuCell, SudokuGridData } from './types';

const cell = (overrides: Partial<SudokuCell> = {}): SudokuCell => ({
  row: 0,
  col: 0,
  value: 0,
  solution: 1,
  isInitial: false,
  notes: [],
  ...overrides,
});

const board = (cells: SudokuCell[]): SudokuGridData => [cells];

const base = { isCompleted: false, isGameOver: false, mistakes: 0, hintsUsed: 0 };

describe('hasSudokuProgress', () => {
  it('is false for an untouched board (only given cells filled)', () => {
    const grid = board([cell({ value: 5, isInitial: true }), cell()]);
    expect(hasSudokuProgress({ ...base, grid })).toBe(false);
  });

  it('is true once the player fills a cell or adds a note', () => {
    expect(hasSudokuProgress({ ...base, grid: board([cell({ value: 3 })]) })).toBe(true);
    expect(hasSudokuProgress({ ...base, grid: board([cell({ notes: [2] })]) })).toBe(true);
  });

  it('is true after a mistake or a hint even if the cell was cleared again', () => {
    expect(hasSudokuProgress({ ...base, mistakes: 1, grid: board([cell()]) })).toBe(true);
    expect(hasSudokuProgress({ ...base, hintsUsed: 1, grid: board([cell()]) })).toBe(true);
  });

  it('is false for a finished board', () => {
    const grid = board([cell({ value: 3 })]);
    expect(hasSudokuProgress({ ...base, isCompleted: true, grid })).toBe(false);
    expect(hasSudokuProgress({ ...base, isGameOver: true, grid })).toBe(false);
  });
});
