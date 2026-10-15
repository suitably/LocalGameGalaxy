import { describe, it, expect } from 'vitest';
import { kniffelReducer, INITIAL_KNIFFEL_STATE } from '../kniffelReducer';
import type { KniffelState } from '../types';

describe('kniffelReducer', () => {
  it('handles ROLL_DICE up to 3 rolls', () => {
    let state = INITIAL_KNIFFEL_STATE;

    state = kniffelReducer(state, { type: 'ROLL_DICE', dice: [6, 6, 6, 2, 1] });
    expect(state.rollCount).toBe(1);
    expect(state.dice).toEqual([6, 6, 6, 2, 1]);

    state = kniffelReducer(state, { type: 'ROLL_DICE', dice: [6, 6, 6, 6, 1] });
    expect(state.rollCount).toBe(2);

    state = kniffelReducer(state, { type: 'ROLL_DICE', dice: [6, 6, 6, 6, 6] });
    expect(state.rollCount).toBe(3);

    // 4th roll should be ignored
    const fourthState = kniffelReducer(state, { type: 'ROLL_DICE', dice: [1, 1, 1, 1, 1] });
    expect(fourthState.rollCount).toBe(3);
    expect(fourthState.dice).toEqual([6, 6, 6, 6, 6]);
  });

  it('handles TOGGLE_HOLD_DIE when rollCount is 1 or 2', () => {
    let state = INITIAL_KNIFFEL_STATE;

    // Before rolling, toggling hold is ignored
    state = kniffelReducer(state, { type: 'TOGGLE_HOLD_DIE', index: 0 });
    expect(state.heldDice[0]).toBe(false);

    // Roll once
    state = kniffelReducer(state, { type: 'ROLL_DICE', dice: [2, 3, 4, 5, 6] });

    // Toggle index 0 and 2
    state = kniffelReducer(state, { type: 'TOGGLE_HOLD_DIE', index: 0 });
    state = kniffelReducer(state, { type: 'TOGGLE_HOLD_DIE', index: 2 });
    expect(state.heldDice).toEqual([true, false, true, false, false]);

    // Untoggle index 0
    state = kniffelReducer(state, { type: 'TOGGLE_HOLD_DIE', index: 0 });
    expect(state.heldDice).toEqual([false, false, true, false, false]);
  });

  it('handles SCORE_CATEGORY and switches players', () => {
    let state = INITIAL_KNIFFEL_STATE;
    state = kniffelReducer(state, { type: 'ROLL_DICE', dice: [5, 5, 5, 1, 2] });

    state = kniffelReducer(state, { type: 'SCORE_CATEGORY', category: 'fives', score: 15 });

    expect(state.players[0].scores.fives).toBe(15);
    expect(state.activePlayerIndex).toBe(1); // Switched to Player 2
    expect(state.rollCount).toBe(0);
    expect(state.heldDice).toEqual([false, false, false, false, false]);
    expect(state.moveHistory.length).toBe(1);
  });

  it('increments kniffel_bonus without switching active player', () => {
    let state = INITIAL_KNIFFEL_STATE;

    state = kniffelReducer(state, { type: 'SCORE_CATEGORY', category: 'kniffel_bonus', score: 50 });

    expect(state.players[0].scores.kniffel_bonus).toBe(1);
    expect(state.activePlayerIndex).toBe(0); // Remains Player 1

    state = kniffelReducer(state, { type: 'SCORE_CATEGORY', category: 'kniffel_bonus', score: 50 });
    expect(state.players[0].scores.kniffel_bonus).toBe(2);
  });

  it('handles UNDO_MOVE correctly restoring previous state', () => {
    let state = INITIAL_KNIFFEL_STATE;
    state = kniffelReducer(state, { type: 'ROLL_DICE', dice: [1, 2, 3, 4, 5] });
    state = kniffelReducer(state, { type: 'TOGGLE_HOLD_DIE', index: 1 });
    state = kniffelReducer(state, { type: 'SCORE_CATEGORY', category: 'small_straight', score: 30 });

    expect(state.activePlayerIndex).toBe(1);
    expect(state.players[0].scores.small_straight).toBe(30);

    state = kniffelReducer(state, { type: 'UNDO_MOVE' });

    expect(state.activePlayerIndex).toBe(0);
    expect(state.players[0].scores.small_straight).toBeNull();
    expect(state.dice).toEqual([1, 2, 3, 4, 5]);
    expect(state.heldDice[1]).toBe(true);
    expect(state.rollCount).toBe(1);
    expect(state.moveHistory.length).toBe(0);
  });

  it('handles SET_PLAYERS, SWITCH_PLAYER, and NEW_GAME', () => {
    let state = INITIAL_KNIFFEL_STATE;

    state = kniffelReducer(state, { type: 'SET_PLAYERS', names: ['Alice', 'Bob', 'Charlie'] });
    expect(state.players.length).toBe(3);
    expect(state.players[0].name).toBe('Alice');
    expect(state.activePlayerIndex).toBe(0);

    state = kniffelReducer(state, { type: 'SWITCH_PLAYER', index: 2 });
    expect(state.activePlayerIndex).toBe(2);

    // Score something for Charlie
    state = kniffelReducer(state, { type: 'SCORE_CATEGORY', category: 'chance', score: 20 });
    expect(state.players[2].scores.chance).toBe(20);

    state = kniffelReducer(state, { type: 'NEW_GAME' });
    expect(state.activePlayerIndex).toBe(0);
    expect(state.players[2].scores.chance).toBeNull();
    expect(state.moveHistory.length).toBe(0);
  });

  it('detects game over when all required categories are scored', () => {
    let state: KniffelState = {
      ...INITIAL_KNIFFEL_STATE,
      players: [
        {
          id: 'p1',
          name: 'P1',
          scores: {
            ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18,
            three_of_a_kind: 15, four_of_a_kind: 20, full_house: 25, small_straight: 30,
            large_straight: 40, kniffel: 50, chance: 20, kniffel_bonus: null
          }
        },
        {
          id: 'p2',
          name: 'P2',
          scores: {
            ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18,
            three_of_a_kind: 15, four_of_a_kind: 20, full_house: 25, small_straight: 30,
            large_straight: 40, kniffel: 50, chance: null, kniffel_bonus: null
          }
        }
      ],
      activePlayerIndex: 1
    };

    expect(state.isGameOver).toBe(false);

    // P2 scores last category
    state = kniffelReducer(state, { type: 'SCORE_CATEGORY', category: 'chance', score: 18 });
    expect(state.isGameOver).toBe(true);
  });
});
