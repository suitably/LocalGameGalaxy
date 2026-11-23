import { describe, expect, it } from 'vitest';
import { canUndoLocal, knisterLocalReducer, type KnisterLocalState } from './knisterLocal';
import { INITIAL_KNISTER_STATE } from './knisterReducer';

const twoPlayers = (): KnisterLocalState =>
  knisterLocalReducer(INITIAL_KNISTER_STATE, { type: 'SET_PLAYERS', names: ['Anna', 'Ben'] });

describe('knister on one device with several players', () => {
  it('keeps the roll until everybody placed it and passes the turn on', () => {
    let s = knisterLocalReducer(twoPlayers(), { type: 'ROLL_DICE', die1: 3, die2: 4 });
    s = knisterLocalReducer(s, { type: 'PLACE_NUMBER', row: 0, col: 0, playerId: 'p1' });
    expect(s.currentRoll?.sum).toBe(7);
    expect(s.placed).toEqual(['p1']);
    expect(s.activePlayerIndex).toBe(1);
    // no second roll while Ben still has to place, and Anna cannot place twice
    expect(knisterLocalReducer(s, { type: 'ROLL_DICE', die1: 1, die2: 1 })).toBe(s);
    expect(knisterLocalReducer(s, { type: 'PLACE_NUMBER', row: 0, col: 1, playerId: 'p1' })).toBe(
      s,
    );
    s = knisterLocalReducer(s, { type: 'PLACE_NUMBER', row: 2, col: 2, playerId: 'p2' });
    expect(s.currentRoll).toBeNull();
    expect(s.placed).toEqual([]);
    expect(s.activePlayerIndex).toBe(0);
    expect(s.players[1].grid[2][2]).toBe(7);
    expect(s.rollCount).toBe(1);
  });

  it('turns a typed-in number into the roll for the others', () => {
    let s = knisterLocalReducer(twoPlayers(), {
      type: 'PLACE_NUMBER',
      row: 0,
      col: 0,
      playerId: 'p1',
      value: 9,
    });
    expect(s.currentRoll).toEqual({ die1: 0, die2: 0, sum: 9 });
    expect(s.rollCount).toBe(1);
    s = knisterLocalReducer(s, { type: 'PLACE_NUMBER', row: 1, col: 1, playerId: 'p2', value: 5 });
    expect(s.players[1].grid[1][1]).toBe(9);
    expect(s.currentRoll).toBeNull();
  });

  it('undoes a placement and returns the turn to that player', () => {
    let s = knisterLocalReducer(twoPlayers(), {
      type: 'PLACE_NUMBER',
      row: 0,
      col: 0,
      playerId: 'p1',
      value: 9,
    });
    s = knisterLocalReducer(s, { type: 'PLACE_NUMBER', row: 1, col: 1, playerId: 'p2' });
    s = knisterLocalReducer(s, { type: 'UNDO_MOVE' });
    expect(s.placed).toEqual(['p1']);
    expect(s.currentRoll?.sum).toBe(9);
    expect(s.activePlayerIndex).toBe(1);
    s = knisterLocalReducer(s, { type: 'UNDO_MOVE' });
    expect(s.currentRoll).toBeNull();
    expect(s.rollCount).toBe(0);
    expect(s.activePlayerIndex).toBe(0);
    expect(s.players[0].grid[0][0]).toBeNull();
  });

  it('plays one player exactly like the single-device reducer', () => {
    const s = knisterLocalReducer(INITIAL_KNISTER_STATE, {
      type: 'PLACE_NUMBER',
      row: 0,
      col: 0,
      value: 4,
    });
    expect(s.currentRoll).toBeNull();
    expect(s.players[0].grid[0][0]).toBe(4);
  });

  it('takes back a placement only until the next roll', () => {
    let s = knisterLocalReducer(INITIAL_KNISTER_STATE, { type: 'ROLL_DICE', die1: 2, die2: 2 });
    s = knisterLocalReducer(s, { type: 'PLACE_NUMBER', row: 0, col: 0 });
    expect(canUndoLocal(s)).toBe(true);
    s = knisterLocalReducer(s, { type: 'ROLL_DICE', die1: 6, die2: 5 });
    expect(canUndoLocal(s)).toBe(false);
    expect(knisterLocalReducer(s, { type: 'UNDO_MOVE' })).toBe(s);
    expect(s.currentRoll?.sum).toBe(11);
    // several players: once someone placed the new roll, undo works again
    let m = knisterLocalReducer(twoPlayers(), { type: 'ROLL_DICE', die1: 1, die2: 2 });
    m = knisterLocalReducer(m, { type: 'PLACE_NUMBER', row: 0, col: 0, playerId: 'p1' });
    expect(canUndoLocal(m)).toBe(true);
  });
});
