import { describe, expect, it } from 'vitest';
import {
  INITIAL_KNIFFEL_ROOM,
  kniffelRoomAllows,
  kniffelRoomReducer,
  type KniffelRoomState,
} from './kniffelRoom';

const started = (): KniffelRoomState =>
  kniffelRoomReducer(INITIAL_KNIFFEL_ROOM, {
    type: 'START',
    hostId: 'a',
    players: [
      { id: 'a', name: 'Anna' },
      { id: 'b', name: 'Ben' },
    ],
  });

describe('kniffel with everyone on their own device', () => {
  it('deals a column per room player and lets only the active player act', () => {
    const s = started();
    expect(s.players.map((p) => p.id)).toEqual(['a', 'b']);
    expect(kniffelRoomAllows(s, { type: 'ROLL', dice: [1, 2, 3, 4, 5] }, 'a')).toBe(true);
    expect(kniffelRoomAllows(s, { type: 'ROLL', dice: [1, 2, 3, 4, 5] }, 'b')).toBe(false);
    expect(kniffelRoomAllows(s, { type: 'NEW_GAME' }, 'b')).toBe(false);
    expect(kniffelRoomAllows(s, { type: 'NEW_GAME' }, 'a')).toBe(true);
  });

  it('keeps held dice, scores once per category and passes the turn on', () => {
    let s = kniffelRoomReducer(started(), { type: 'ROLL', dice: [6, 6, 6, 2, 3] });
    s = kniffelRoomReducer(s, { type: 'HOLD', index: 0 });
    s = kniffelRoomReducer(s, { type: 'ROLL', dice: [1, 6, 6, 6, 6] });
    expect(s.dice).toEqual([6, 6, 6, 6, 6]);
    s = kniffelRoomReducer(s, { type: 'SCORE', category: 'sixes', score: 30 });
    expect(s.players[0].scores.sixes).toBe(30);
    expect(s.activePlayerIndex).toBe(1);
    // Ben has not rolled yet, and a scored category stays written
    expect(kniffelRoomReducer(s, { type: 'SCORE', category: 'ones', score: 0 })).toBe(s);
    s = kniffelRoomReducer(s, { type: 'ROLL', dice: [1, 1, 2, 3, 4] });
    s = kniffelRoomReducer(s, { type: 'SCORE', category: 'ones', score: 2 });
    s = kniffelRoomReducer(s, { type: 'ROLL', dice: [2, 2, 2, 3, 4] });
    expect(kniffelRoomReducer(s, { type: 'SCORE', category: 'sixes', score: 0 })).toBe(s);
  });

  it('ignores invalid dice', () => {
    const s = started();
    expect(kniffelRoomReducer(s, { type: 'ROLL', dice: [7, 1, 1, 1, 1] })).toBe(s);
    expect(kniffelRoomReducer(s, { type: 'ROLL', dice: [1, 1] })).toBe(s);
  });
});
