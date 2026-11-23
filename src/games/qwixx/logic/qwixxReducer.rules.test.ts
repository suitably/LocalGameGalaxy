import { describe, it, expect } from 'vitest';
import {
  calculateRowScore,
  calculateTotalScore,
  canCrossNumber,
  createInitialSheet,
  getRowNumbersForSheet,
  INITIAL_DICE,
  INITIAL_STATE,
  qwixxReducer,
} from './qwixxReducer';
import type { QwixxAction, QwixxGameState, QwixxSheetType, RowColor } from './types';

// Expected values come from docs/tech/qwixx-sheet-rules.md.

const stateFor = (sheetType: QwixxSheetType, presetIndex = 0): QwixxGameState => ({
  ...INITIAL_STATE,
  mySheet: createInitialSheet('P', sheetType, presetIndex),
});

const run = (state: QwixxGameState, ...actions: QwixxAction[]) =>
  actions.reduce(qwixxReducer, state);

const cross = (state: QwixxGameState, color: RowColor, numbers: number[]) =>
  run(state, ...numbers.map((number): QwixxAction => ({ type: 'CROSS_NUMBER', color, number })));

describe('scoring table (rules doc, Classic section 4)', () => {
  it('matches n*(n+1)/2 for 0..12 crosses', () => {
    const table = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66, 78];
    table.forEach((points, n) => expect(calculateRowScore(n)).toBe(points));
    expect(calculateRowScore(-3)).toBe(0);
  });

  it('subtracts 5 points per miss', () => {
    const s = run(cross(INITIAL_STATE, 'red', [2, 3]), { type: 'ADD_MISS' }, { type: 'ADD_MISS' });
    const score = calculateTotalScore(s.mySheet);
    expect(score.missesPenalty).toBe(10);
    expect(score.total).toBe(3 - 10);
  });
});

describe('Classic marking rules', () => {
  it('requires strict left-to-right order and allows skipping', () => {
    const s = cross(INITIAL_STATE, 'red', [5, 3, 9]);
    expect(s.mySheet.red.crossed).toEqual([5, 9]);
  });

  it('runs 12 down to 2 for green and blue', () => {
    const s = cross(INITIAL_STATE, 'green', [12, 9, 11, 4]);
    expect(s.mySheet.green.crossed).toEqual([12, 9, 4]);
  });

  it('rejects numbers outside the row and double crossing', () => {
    expect(cross(INITIAL_STATE, 'red', [1, 13]).mySheet.red.crossed).toEqual([]);
    expect(canCrossNumber([2, 3, 4], [2], 2)).toBe(false);
    expect(canCrossNumber([2, 3, 4], [], 99)).toBe(false);
  });

  it('only uncrosses the last crossed number (tap again)', () => {
    const s = cross(INITIAL_STATE, 'red', [2, 3, 4]);
    expect(cross(s, 'red', [3])).toBe(s);
    expect(cross(s, 'red', [4]).mySheet.red.crossed).toEqual([2, 3]);
  });

  it('does not lock with fewer than 5 crosses including the lock number', () => {
    const s = cross(INITIAL_STATE, 'red', [2, 3, 4, 12]);
    expect(s.mySheet.red.isLocked).toBe(false);
    expect(s.mySheet.red.crossed).toEqual([2, 3, 4, 12]);
  });

  it('locks with exactly 5 crosses including the lock number (+1 bonus cross)', () => {
    const s = cross(INITIAL_STATE, 'blue', [12, 11, 10, 9, 2]);
    expect(s.mySheet.blue.isLocked).toBe(true);
    // 5 crosses + lock cross = 6 -> 21
    expect(calculateTotalScore(s.mySheet).blue).toBe(21);
  });

  it('refuses crossing a locked row until it is unlocked', () => {
    const locked = cross(INITIAL_STATE, 'red', [2, 3, 4, 5, 12]);
    expect(locked.mySheet.red.isLocked).toBe(true);
    expect(cross(locked, 'red', [12])).toBe(locked);
    const unlocked = run(locked, { type: 'UNLOCK_ROW', color: 'red' });
    expect(unlocked.mySheet.red.isLocked).toBe(false);
  });

  it('LOCK_ROW on a locked row and UNLOCK_ROW on an open row are no-ops', () => {
    const locked = run(INITIAL_STATE, { type: 'LOCK_ROW', color: 'yellow' });
    expect(run(locked, { type: 'LOCK_ROW', color: 'yellow' })).toBe(locked);
    expect(run(INITIAL_STATE, { type: 'UNLOCK_ROW', color: 'yellow' })).toBe(INITIAL_STATE);
  });
});

describe('misses (4 miss fields, -5 each)', () => {
  it('caps at 4 and ignores removal below 0', () => {
    const four = run(INITIAL_STATE, ...Array<QwixxAction>(6).fill({ type: 'ADD_MISS' }));
    expect(four.mySheet.misses).toBe(4);
    expect(calculateTotalScore(four.mySheet).missesPenalty).toBe(20);
    expect(run(INITIAL_STATE, { type: 'REMOVE_MISS' })).toBe(INITIAL_STATE);
    expect(run(four, { type: 'REMOVE_MISS' }).mySheet.misses).toBe(3);
  });
});

describe('Gemixxt B', () => {
  it('follows the shuffled number order of the red row and locks with the 2', () => {
    const s = stateFor('gemixxt_b');
    expect(getRowNumbersForSheet(s.mySheet, 'red')).toEqual([5, 7, 11, 9, 12, 3, 8, 10, 4, 6, 2]);
    // 12 is left of 3 in this row, so 3 then 12 is refused
    expect(cross(s, 'red', [3, 12]).mySheet.red.crossed).toEqual([3]);
    expect(cross(s, 'red', [5, 7, 11, 9, 2]).mySheet.red.isLocked).toBe(true);
  });

  it.each([
    ['yellow', [9, 12, 4, 6, 10]],
    ['green', [8, 2, 10, 12, 3]],
    ['blue', [10, 6, 2, 8, 4]],
  ] as [RowColor, number[]][])('locks the %s row with its closing number', (color, nums) => {
    expect(cross(stateFor('gemixxt_b'), color, nums).mySheet[color].isLocked).toBe(true);
  });
});

describe('Big Points bonus rows', () => {
  const bonus = (s: QwixxGameState, rowId: string, number: number) =>
    run(s, { type: 'CROSS_NUMBER', color: 'red', number, isBonusRow: true, rowId });
  const crossedIn = (s: QwixxGameState, rowId: string) => s.mySheet.bonusRows?.[rowId].crossed;

  it('needs a cross in the same column of an adjacent colour row', () => {
    const s = stateFor('big_points');
    expect(crossedIn(bonus(s, 'bonus_red_yellow', 5), 'bonus_red_yellow')).toEqual([]);
    const withRed = cross(s, 'red', [5]);
    expect(crossedIn(bonus(withRed, 'bonus_red_yellow', 5), 'bonus_red_yellow')).toEqual([5]);
    const withYellow = cross(s, 'yellow', [6]);
    expect(crossedIn(bonus(withYellow, 'bonus_red_yellow', 6), 'bonus_red_yellow')).toEqual([6]);
  });

  it('works for the green-blue row, left to right (12 down to 2)', () => {
    let s = cross(stateFor('big_points'), 'blue', [11, 4]);
    s = bonus(s, 'bonus_green_blue', 11);
    s = bonus(s, 'bonus_green_blue', 4);
    expect(crossedIn(s, 'bonus_green_blue')).toEqual([11, 4]);
    // 12 is left of 11 and may no longer be crossed
    s = cross(s, 'green', [12]);
    expect(crossedIn(bonus(s, 'bonus_green_blue', 12), 'bonus_green_blue')).toEqual([11, 4]);
  });

  it('only uncrosses the last bonus cross and ignores unknown rows', () => {
    let s = cross(stateFor('big_points'), 'red', [3, 4]);
    s = bonus(s, 'bonus_red_yellow', 3);
    s = bonus(s, 'bonus_red_yellow', 4);
    expect(bonus(s, 'bonus_red_yellow', 3)).toBe(s);
    expect(crossedIn(bonus(s, 'bonus_red_yellow', 4), 'bonus_red_yellow')).toEqual([3]);
    expect(bonus(s, 'bonus_nope', 3)).toBe(s);
  });

  it('counts bonus crosses for both neighbouring colours', () => {
    let s = cross(stateFor('big_points'), 'red', [2, 3]);
    s = bonus(s, 'bonus_red_yellow', 2);
    s = bonus(s, 'bonus_red_yellow', 3);
    const score = calculateTotalScore(s.mySheet);
    expect(score.bonusRedYellow).toBe(2);
    expect(score.red).toBe(calculateRowScore(4));
    expect(score.yellow).toBe(calculateRowScore(2));
    expect(score.bonusGreenBlue).toBeUndefined();
  });

  it('keeps the bonus row playable after the colour row is locked', () => {
    let s = cross(stateFor('big_points'), 'red', [2, 3, 4, 5, 12]);
    expect(s.mySheet.red.isLocked).toBe(true);
    s = bonus(s, 'bonus_red_yellow', 12);
    expect(crossedIn(s, 'bonus_red_yellow')).toEqual([12]);
  });
});

describe('Connected Stairs', () => {
  it('scores the 5th category from stair cells only', () => {
    let s = stateFor('connected_stairs');
    s = cross(s, 'red', [2, 3, 8]); // stairs: 2 and 3; 8 is not a stair
    s = cross(s, 'blue', [4]); // stair
    const score = calculateTotalScore(s.mySheet);
    // 3 stair crosses = 6 points
    expect(score.stairsBonus).toBe(6);
    expect(score.total).toBe(calculateRowScore(3) + calculateRowScore(1) + 6);
  });
});

describe('Connected Chains', () => {
  // Chain pairs as defined in sheetDefinitions.ts: red 6 <-> yellow 6, red 11 <-> yellow 11.
  it('crosses the partner cell automatically', () => {
    const s = cross(stateFor('connected_chains'), 'red', [6]);
    expect(s.mySheet.red.crossed).toEqual([6]);
    expect(s.mySheet.yellow.crossed).toEqual([6]);
  });

  it('does not cross the partner when it lies left of the last cross or the row is locked', () => {
    const base = stateFor('connected_chains');
    const ahead = cross(base, 'yellow', [8]);
    expect(cross(ahead, 'red', [6]).mySheet.yellow.crossed).toEqual([8]);
    const locked = run(base, { type: 'LOCK_ROW', color: 'yellow' });
    expect(cross(locked, 'red', [6]).mySheet.yellow.crossed).toEqual([]);
  });

  it('crosses a partner that is not a closing number without locking', () => {
    const s = cross(stateFor('connected_chains'), 'red', [11]);
    expect(s.mySheet.yellow.crossed).toEqual([11]);
    expect(s.mySheet.yellow.isLocked).toBe(false);
  });

  it.todo(
    'doc pairs (red 4 <-> yellow 6, red 9 <-> blue 7, yellow 3 <-> green 10, green 6 <-> blue 4, yellow 11 <-> green 3) differ from the chainIds in sheetDefinitions.ts; maintainer decision needed',
  );
});

describe('Double Sub-box cycle', () => {
  it('cycles main box, sub box, then reset', () => {
    let s = stateFor('double_sub');
    s = cross(s, 'red', [4]);
    expect(s.mySheet.red.crossed).toEqual([4]);
    s = cross(s, 'red', [4]);
    expect(s.mySheet.red.subCrossed).toEqual([4]);
    expect(calculateTotalScore(s.mySheet).red).toBe(3); // 2 crosses
    s = cross(s, 'red', [4]);
    expect(s.mySheet.red.crossed).toEqual([]);
    expect(s.mySheet.red.subCrossed).toEqual([]);
  });

  it('only removes the sub box on the third tap when the main box is not the rightmost', () => {
    let s = cross(stateFor('double_sub'), 'red', [4, 4, 6]);
    expect(s.mySheet.red.crossed).toEqual([4, 6]);
    s = cross(s, 'red', [4]);
    expect(s.mySheet.red.crossed).toEqual([4, 6]);
    expect(s.mySheet.red.subCrossed).toEqual([]);
  });

  it('refuses the first tap when the number lies left of an existing cross', () => {
    const s = cross(stateFor('double_sub'), 'red', [6, 4]);
    expect(s.mySheet.red.crossed).toEqual([6]);
  });

  it('locks via the main box and a reset of the lock number unlocks again', () => {
    let s = cross(stateFor('double_sub'), 'red', [2, 3, 4, 5, 12]);
    expect(s.mySheet.red.isLocked).toBe(true);
    s = run(s, { type: 'UNLOCK_ROW', color: 'red' });
    s = cross(s, 'red', [12, 12]); // sub box, then reset (tap 3)
    expect(s.mySheet.red.crossed).toEqual([2, 3, 4, 5]);
    expect(s.mySheet.red.isLocked).toBe(false);
  });

  it('CROSS_SUB_BOX toggles only on crossed, unlocked cells', () => {
    const base = cross(stateFor('double_sub'), 'red', [5]);
    expect(run(base, { type: 'CROSS_SUB_BOX', color: 'red', number: 6 })).toBe(base);
    const on = run(base, { type: 'CROSS_SUB_BOX', color: 'red', number: 5 });
    expect(on.mySheet.red.subCrossed).toEqual([5]);
    const off = run(on, { type: 'CROSS_SUB_BOX', color: 'red', number: 5 });
    expect(off.mySheet.red.subCrossed).toEqual([]);
    const locked = run(on, { type: 'LOCK_ROW', color: 'red' });
    expect(run(locked, { type: 'CROSS_SUB_BOX', color: 'red', number: 5 })).toBe(locked);
  });
});

describe('Double Numbers', () => {
  it('counts a double cell as two crosses', () => {
    const s = cross(stateFor('double_numbers'), 'red', [6]); // red 6 is a double number
    expect(calculateTotalScore(s.mySheet).red).toBe(3);
    const plain = cross(stateFor('double_numbers'), 'red', [5]);
    expect(calculateTotalScore(plain.mySheet).red).toBe(1);
  });

  it('counts the double cell for the lock threshold', () => {
    // 2, 3 = 2 crosses; 6 counts twice -> 4; lock number 12 makes 5 -> locks
    const s = cross(stateFor('double_numbers'), 'red', [2, 3, 6, 12]);
    expect(s.mySheet.red.isLocked).toBe(true);
  });
});

describe('Bonus sheet effects', () => {
  it('self_cross crosses the next eligible number in the same row (red 4)', () => {
    const s = cross(stateFor('bonus'), 'red', [4]);
    expect(s.mySheet.red.crossed).toEqual([4, 5]);
  });

  it('partner_cross crosses the first eligible number in the partner row (red 8 -> yellow)', () => {
    const s = cross(stateFor('bonus'), 'red', [8]);
    expect(s.mySheet.yellow.crossed).toEqual([2]);
  });

  it('partner_cross is skipped when the target row is locked', () => {
    const base = run(stateFor('bonus'), { type: 'LOCK_ROW', color: 'yellow' });
    expect(cross(base, 'red', [8]).mySheet.yellow.crossed).toEqual([]);
  });

  it('shield gives protection that absorbs one miss', () => {
    let s = cross(stateFor('bonus'), 'yellow', [9]);
    expect(s.mySheet.shields).toBe(1);
    s = run(s, { type: 'ADD_MISS' });
    expect(s.mySheet.misses).toBe(0);
    expect(s.mySheet.shields).toBe(0);
    s = run(s, { type: 'ADD_MISS' });
    expect(s.mySheet.misses).toBe(1);
  });
});

describe('sheet lifecycle and dice actions', () => {
  it('CHANGE_SHEET_TYPE starts a fresh sheet of the new type, keeping the name', () => {
    const s = run(cross(INITIAL_STATE, 'red', [2]), {
      type: 'CHANGE_SHEET_TYPE',
      sheetType: 'gemixxt_b',
      presetIndex: 1,
    });
    expect(s.mySheet.sheetType).toBe('gemixxt_b');
    expect(s.mySheet.presetIndex).toBe(1);
    expect(s.mySheet.red.crossed).toEqual([]);
  });

  it('createInitialSheet sets Longo lucky numbers, random_mix rows and bonus rows', () => {
    expect(createInitialSheet('P', 'longo', 0).luckyNumbers).toBeDefined();
    expect(createInitialSheet('P', 'classic').luckyNumbers).toBeUndefined();
    expect(createInitialSheet('P', 'random_mix').customRows).toHaveLength(4);
    expect(createInitialSheet('P', 'big_points').bonusRows).toHaveProperty('bonus_red_yellow');
  });

  it('START_ROLL / FINISH_ROLL toggle rolling and store dice', () => {
    const rolling = run(INITIAL_STATE, { type: 'START_ROLL' });
    expect(rolling.isRolling).toBe(true);
    const dice = { ...INITIAL_DICE, white1: 4, white2: 6 };
    const done = run(rolling, { type: 'FINISH_ROLL', dice });
    expect(done.isRolling).toBe(false);
    expect(done.dice).toEqual(dice);
  });

  it('RESET_GAME clears the sheet but keeps name and sheet type', () => {
    const played = run(
      stateFor('gemixxt_b', 2),
      { type: 'CROSS_NUMBER', color: 'red', number: 5 },
      { type: 'ADD_MISS' },
    );
    const reset = run(played, { type: 'RESET_GAME' });
    expect(reset.mySheet.sheetType).toBe('gemixxt_b');
    expect(reset.mySheet.presetIndex).toBe(2);
    expect(reset.mySheet.name).toBe('P');
    expect(reset.mySheet.red.crossed).toEqual([]);
    expect(reset.mySheet.misses).toBe(0);
  });

  it('returns the same state for unknown actions', () => {
    expect(qwixxReducer(INITIAL_STATE, { type: 'NOPE' } as unknown as QwixxAction)).toBe(
      INITIAL_STATE,
    );
  });
});
