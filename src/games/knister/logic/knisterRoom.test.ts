import { describe, expect, it } from 'vitest';
import {
  INITIAL_KNISTER_ROOM,
  knisterRoomAllows,
  knisterRoomReducer,
  type KnisterRoomState,
} from './knisterRoom';

const start = (): KnisterRoomState =>
  knisterRoomReducer(INITIAL_KNISTER_ROOM, {
    type: 'START',
    hostId: 'a',
    players: [
      { id: 'a', name: 'Ann' },
      { id: 'b', name: 'Ben' },
    ],
  });

describe('Knister with everyone on their own device', () => {
  it('one roll is placed by every player, then the next roll is possible', () => {
    let s = knisterRoomReducer(start(), { type: 'ROLL', die1: 3, die2: 4 });
    expect(knisterRoomReducer(s, { type: 'ROLL', die1: 1, die2: 1 })).toBe(s);

    s = knisterRoomReducer(s, { type: 'PLACE', row: 0, col: 0, playerId: 'a' });
    expect(s.currentRoll?.sum).toBe(7);
    expect(s.placed).toEqual(['a']);
    // Placing twice on the same roll is ignored.
    expect(knisterRoomReducer(s, { type: 'PLACE', row: 0, col: 1, playerId: 'a' })).toBe(s);

    s = knisterRoomReducer(s, { type: 'PLACE', row: 2, col: 2, playerId: 'b' });
    expect(s.currentRoll).toBeNull();
    expect(s.placed).toEqual([]);
    expect(s.players[0].grid[0][0]).toBe(7);
    expect(s.players[1].grid[2][2]).toBe(7);
    expect(s.rollCount).toBe(1);
  });

  it('ends after the 25th roll once everybody placed it', () => {
    let s = start();
    for (let i = 0; i < 25; i++) {
      s = knisterRoomReducer(s, { type: 'ROLL', die1: 1, die2: 1 });
      s = knisterRoomReducer(s, {
        type: 'PLACE',
        row: Math.floor(i / 5),
        col: i % 5,
        playerId: 'a',
      });
      if (i === 24) expect(s.isGameOver).toBe(false);
      s = knisterRoomReducer(s, {
        type: 'PLACE',
        row: Math.floor(i / 5),
        col: i % 5,
        playerId: 'b',
      });
    }
    expect(s.isGameOver).toBe(true);
  });

  it('the host lets players act only on their own sheet', () => {
    const s = start();
    expect(knisterRoomAllows(s, { type: 'PLACE', row: 0, col: 0, playerId: 'b' }, 'a')).toBe(false);
    expect(knisterRoomAllows(s, { type: 'PLACE', row: 0, col: 0, playerId: 'b' }, 'b')).toBe(true);
    expect(knisterRoomAllows(s, { type: 'NEW_GAME' }, 'b')).toBe(false);
    expect(knisterRoomAllows(s, { type: 'ROLL', die1: 1, die2: 2 }, 'b')).toBe(true);
    expect(knisterRoomAllows(s, { type: 'ROLL', die1: 1, die2: 2 }, 'stranger')).toBe(false);
  });
});
