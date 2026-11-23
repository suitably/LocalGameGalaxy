import { describe, expect, it } from 'vitest';
import {
  closedRows,
  INITIAL_QWIXX_ROOM,
  qwixxRoomAllows,
  qwixxRoomReducer,
  rowsToLock,
  sameSummary,
  summarizeSheet,
  type QwixxRoomState,
} from './qwixxRoom';
import { createInitialSheet, INITIAL_DICE, INITIAL_STATE, qwixxReducer } from './qwixxReducer';

const started = (): QwixxRoomState =>
  qwixxRoomReducer(INITIAL_QWIXX_ROOM, {
    type: 'START',
    hostId: 'a',
    gameId: 'g1',
    players: [
      { id: 'a', name: 'Anna' },
      { id: 'b', name: 'Ben' },
    ],
  });
const dice = { ...INITIAL_DICE, white1: 5, white2: 2 };

describe('qwixx with everyone on their own device', () => {
  it('lets the roller roll once, waits for everyone, then passes the dice on', () => {
    let s = started();
    expect(s.gameId).toBe('g1');
    expect(qwixxRoomAllows(s, { type: 'ROLL', dice }, 'b')).toBe(false);
    expect(qwixxRoomAllows(s, { type: 'ROLL', dice }, 'a')).toBe(true);
    s = qwixxRoomReducer(s, { type: 'ROLL', dice });
    expect(s.rolled).toBe(true);
    expect(qwixxRoomReducer(s, { type: 'ROLL', dice: INITIAL_DICE })).toBe(s);
    s = qwixxRoomReducer(s, { type: 'DONE', playerId: 'a' });
    expect(s.done).toEqual(['a']);
    expect(qwixxRoomReducer(s, { type: 'DONE', playerId: 'a' })).toBe(s);
    s = qwixxRoomReducer(s, { type: 'DONE', playerId: 'b' });
    expect(s).toMatchObject({ rolled: false, done: [], rollerIndex: 1 });
  });

  it('players report only for themselves', () => {
    const s = started();
    const summary = { total: 3, misses: 0, locked: [] };
    expect(qwixxRoomAllows(s, { type: 'REPORT', playerId: 'b', summary }, 'b')).toBe(true);
    expect(qwixxRoomAllows(s, { type: 'REPORT', playerId: 'b', summary }, 'a')).toBe(false);
    expect(qwixxRoomAllows(s, { type: 'DONE', playerId: 'x' }, 'x')).toBe(false);
  });

  it('ends with two closed rows or four misses and starts a new round', () => {
    let s = qwixxRoomReducer(started(), {
      type: 'REPORT',
      playerId: 'a',
      summary: { total: 40, misses: 1, locked: ['red'] },
    });
    expect(s.isGameOver).toBe(false);
    s = qwixxRoomReducer(s, {
      type: 'REPORT',
      playerId: 'b',
      summary: { total: 30, misses: 0, locked: ['red', 'blue'] },
    });
    expect(closedRows(s).sort()).toEqual(['blue', 'red']);
    expect(s.isGameOver).toBe(true);
    s = qwixxRoomReducer(s, { type: 'NEW_GAME', gameId: 'g2' });
    expect(s).toMatchObject({ isGameOver: false, gameId: 'g2', boards: {} });
    expect(s.players).toHaveLength(2);
    s = qwixxRoomReducer(s, {
      type: 'REPORT',
      playerId: 'a',
      summary: { total: -20, misses: 4, locked: [] },
    });
    expect(s.isGameOver).toBe(true);
  });

  it('locks a row another player closed on this sheet, not the own closed rows', () => {
    const s = qwixxRoomReducer(started(), {
      type: 'REPORT',
      playerId: 'b',
      summary: { total: 30, misses: 0, locked: ['red'] },
    });
    const mine = createInitialSheet('Anna');
    expect(rowsToLock(mine, s, 'a')).toEqual(['red']);
    expect(rowsToLock({ ...mine, red: { crossed: [], isLocked: true } }, s, 'a')).toEqual([]);
    // Ben's own closed row is not locked again on Ben's sheet (he may still undo it)
    expect(rowsToLock(mine, s, 'b')).toEqual([]);
    // a locked row takes no crosses and still counts for the end
    const locked = qwixxReducer(
      { ...INITIAL_STATE, mySheet: mine },
      { type: 'LOCK_ROW', color: 'red' },
    );
    const crossed = qwixxReducer(locked, { type: 'CROSS_NUMBER', color: 'red', number: 2 });
    expect(crossed.mySheet.red.crossed).toEqual([]);
    expect(closedRows(s)).toEqual(['red']);
  });

  it('summarizes a sheet for the scoreboard', () => {
    const sheet = createInitialSheet('Anna');
    const locked = { ...sheet, misses: 2, red: { crossed: [2, 3], isLocked: true } };
    // locked without its lock number: someone else closed it, not this player
    expect(summarizeSheet(locked).locked).toEqual([]);
    const closed = { ...locked, red: { crossed: [2, 3, 4, 5, 6, 12], isLocked: true } };
    const summary = summarizeSheet(closed);
    expect(summary).toMatchObject({ misses: 2, locked: ['red'] });
    expect(sameSummary(summary, { ...summary, locked: ['red'] })).toBe(true);
    expect(sameSummary(undefined, summary)).toBe(false);
  });
});
