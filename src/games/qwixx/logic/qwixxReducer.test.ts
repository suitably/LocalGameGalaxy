import { describe, it, expect } from 'vitest';
import {
  calculateTotalScore,
  canUncrossNumber,
  createInitialSheet,
  INITIAL_STATE,
  qwixxReducer,
} from './qwixxReducer';
import type { QwixxGameState, RowColor } from './types';

describe('Qwixx Logic - canUncrossNumber', () => {
  it('returns false when the crossed array is empty', () => {
    expect(canUncrossNumber([], 5)).toBe(false);
  });

  it('returns true when the number is the last crossed number', () => {
    expect(canUncrossNumber([2, 3, 4], 4)).toBe(true);
  });

  it('returns false when the number is crossed but not the last one', () => {
    expect(canUncrossNumber([2, 3, 4], 3)).toBe(false);
  });

  it('returns false when the number is not in the crossed array', () => {
    expect(canUncrossNumber([2, 3, 4], 5)).toBe(false);
  });
});

describe('Qwixx Logic - closing rows', () => {
  const cross = (state: QwixxGameState, color: RowColor, numbers: number[]) =>
    numbers.reduce((s, number) => qwixxReducer(s, { type: 'CROSS_NUMBER', color, number }), state);

  it('lets a player close a row another player locked, without the lock bonus', () => {
    const state = cross(INITIAL_STATE, 'red', [2, 3]);
    const closed = qwixxReducer(state, { type: 'LOCK_ROW', color: 'red' });

    expect(closed.mySheet.red.isLocked).toBe(true);
    // 2 crosses = 3 points, no +1 cross for the lock
    expect(calculateTotalScore(closed.mySheet).red).toBe(3);
  });

  it('ignores crosses in a row closed by another player', () => {
    const closed = qwixxReducer(INITIAL_STATE, { type: 'LOCK_ROW', color: 'blue' });
    const after = cross(closed, 'blue', [12]);
    expect(after.mySheet.blue.crossed).toEqual([]);
  });

  it('gives the lock bonus when the row is closed by crossing the lock number', () => {
    const locked = cross(INITIAL_STATE, 'red', [2, 3, 4, 5, 6, 12]);

    expect(locked.mySheet.red.isLocked).toBe(true);
    // 6 crosses + 1 lock cross = 7 -> 28 points
    expect(calculateTotalScore(locked.mySheet).red).toBe(28);
  });

  it('keeps the lock bonus for Longo rows closed with 16 or 2', () => {
    const longo = { ...INITIAL_STATE, mySheet: createInitialSheet('P', 'longo') };
    const locked = cross(longo, 'yellow', [2, 3, 4, 5, 6, 7, 16]);

    expect(locked.mySheet.yellow.isLocked).toBe(true);
    expect(calculateTotalScore(locked.mySheet).yellow).toBe(36);
  });
});
