import { describe, it, expect } from 'vitest';
import { knisterReducer, INITIAL_KNISTER_STATE } from './knisterReducer';

describe('knisterReducer', () => {
  it('handles virtual roll and placement', () => {
    let state = knisterReducer(INITIAL_KNISTER_STATE, { type: 'ROLL_DICE', die1: 3, die2: 4 });
    expect(state.currentRoll).toEqual({ die1: 3, die2: 4, sum: 7 });
    expect(state.rollCount).toBe(1);
    expect(state.rollHistory.length).toBe(1);

    state = knisterReducer(state, { type: 'PLACE_NUMBER', row: 0, col: 0 });
    expect(state.players[0].grid[0][0]).toBe(7);
    expect(state.currentRoll).toBeNull();
    expect(state.rollCount).toBe(1);
    expect(state.moveHistory.length).toBe(1);
  });

  it('handles direct manual placement with value', () => {
    let state = knisterReducer(INITIAL_KNISTER_STATE, {
      type: 'PLACE_NUMBER',
      row: 2,
      col: 2,
      value: 11,
    });

    expect(state.players[0].grid[2][2]).toBe(11);
    expect(state.currentRoll).toBeNull();
    expect(state.rollCount).toBe(1);
    expect(state.rollHistory[0].sum).toBe(11);
    expect(state.moveHistory.length).toBe(1);
  });

  it('does not allow invalid values or placing on already filled cells', () => {
    let state = knisterReducer(INITIAL_KNISTER_STATE, {
      type: 'PLACE_NUMBER',
      row: 1,
      col: 1,
      value: 7,
    });
    expect(state.players[0].grid[1][1]).toBe(7);

    // Try placing another number on the same cell
    state = knisterReducer(state, {
      type: 'PLACE_NUMBER',
      row: 1,
      col: 1,
      value: 8,
    });
    expect(state.players[0].grid[1][1]).toBe(7);
    expect(state.rollCount).toBe(1);

    // Try placing invalid number (< 2 or > 12)
    state = knisterReducer(state, {
      type: 'PLACE_NUMBER',
      row: 0,
      col: 0,
      value: 13,
    });
    expect(state.players[0].grid[0][0]).toBeNull();
  });

  it('handles UNDO_MOVE for manual placement', () => {
    let state = knisterReducer(INITIAL_KNISTER_STATE, {
      type: 'PLACE_NUMBER',
      row: 0,
      col: 0,
      value: 5,
    });
    expect(state.players[0].grid[0][0]).toBe(5);
    expect(state.rollCount).toBe(1);

    state = knisterReducer(state, { type: 'UNDO_MOVE' });
    expect(state.players[0].grid[0][0]).toBeNull();
    expect(state.rollCount).toBe(0);
    expect(state.moveHistory.length).toBe(0);
    expect(state.rollHistory.length).toBe(0);
  });

  it('handles UNDO_MOVE for virtual roll placement', () => {
    let state = knisterReducer(INITIAL_KNISTER_STATE, { type: 'ROLL_DICE', die1: 2, die2: 3 });
    state = knisterReducer(state, { type: 'PLACE_NUMBER', row: 1, col: 1 });
    expect(state.players[0].grid[1][1]).toBe(5);
    expect(state.currentRoll).toBeNull();

    state = knisterReducer(state, { type: 'UNDO_MOVE' });
    expect(state.players[0].grid[1][1]).toBeNull();
    expect(state.currentRoll).toEqual({ die1: 2, die2: 3, sum: 5 });
    expect(state.moveHistory.length).toBe(0);
  });

  it('resets all state on NEW_GAME', () => {
    let state = knisterReducer(INITIAL_KNISTER_STATE, {
      type: 'PLACE_NUMBER',
      row: 0,
      col: 0,
      value: 6,
    });
    state = knisterReducer(state, { type: 'NEW_GAME' });
    expect(state.players[0].grid[0][0]).toBeNull();
    expect(state.rollCount).toBe(0);
    expect(state.moveHistory.length).toBe(0);
    expect(state.rollHistory.length).toBe(0);
    expect(state.currentRoll).toBeNull();
  });
});
