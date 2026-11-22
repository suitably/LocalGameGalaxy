import { describe, expect, it } from 'vitest';
import {
  INITIAL_IMPOSTER_ROOM,
  drawImposters,
  imposterRoomAllows,
  imposterRoomReducer as reduce,
  imposterRoomView,
  mostVoted,
  type ImposterRoomAction,
  type ImposterRoomState,
} from '../imposterRoom';

const players = ['h', 'a', 'b', 'c'].map((id) => ({ id, name: id.toUpperCase() }));
const run = (state: ImposterRoomState, ...actions: ImposterRoomAction[]) =>
  actions.reduce(reduce, state);
const started = () =>
  run(
    INITIAL_IMPOSTER_ROOM,
    { type: 'SETUP', hostId: 'h', players },
    { type: 'START', word: 'Apple', hint: 'Fruit', imposterIds: ['b'], timerLength: 60 },
  );
const discussing = () =>
  run(started(), ...players.map((p) => ({ type: 'SEEN', playerId: p.id }) as const), {
    type: 'DISCUSS',
    at: 1000,
  });

describe('imposter room', () => {
  it('shows each seat only its own clue and hides the imposters from the table', () => {
    const s = started();
    expect(imposterRoomView(s, 1).me).toMatchObject({ id: 'a', imposter: false, clue: 'Apple' });
    expect(imposterRoomView(s, 2).me).toMatchObject({ id: 'b', imposter: true, clue: 'Fruit' });
    const table = imposterRoomView(s, null);
    expect(table.me).toBeNull();
    expect(table.result).toBeNull();
    expect(JSON.stringify(table)).not.toMatch(/Apple|Fruit/);
    expect(JSON.stringify(imposterRoomView(s, 1))).not.toMatch(/Fruit/);
  });

  it('starts the discussion only once everyone has seen their card', () => {
    const s = run(started(), { type: 'SEEN', playerId: 'a' }, { type: 'DISCUSS', at: 0 });
    expect(s.phase).toBe('REVEAL');
    const d = discussing();
    expect(d.phase).toBe('DISCUSS');
    expect(d.discussEndsAt).toBe(61_000);
  });

  it('kicks the most voted player; a caught imposter means the others win', () => {
    const votes = (targets: Record<string, string>) =>
      run(
        discussing(),
        { type: 'START_VOTE' },
        ...Object.entries(targets).map(
          ([playerId, target]) => ({ type: 'VOTE', playerId, target }) as const,
        ),
      );
    const caught = votes({ h: 'b', a: 'b', b: 'a', c: 'b' });
    expect(caught).toMatchObject({ phase: 'RESULT', kicked: 'b', winner: 'NORMAL' });
    expect(imposterRoomView(caught, null).result).toMatchObject({
      imposterIds: ['b'],
      word: 'Apple',
      tally: { b: 3, a: 1 },
    });
    const tie = votes({ h: 'a', a: 'b', b: 'a', c: 'b' });
    expect(tie).toMatchObject({ phase: 'RESULT', kicked: null, winner: 'IMPOSTERS' });
  });

  it('ignores self votes, double votes and votes outside the voting phase', () => {
    const d = discussing();
    expect(reduce(d, { type: 'VOTE', playerId: 'a', target: 'b' })).toBe(d);
    const v = run(d, { type: 'START_VOTE' }, { type: 'VOTE', playerId: 'a', target: 'b' });
    expect(reduce(v, { type: 'VOTE', playerId: 'a', target: 'c' })).toBe(v);
    expect(reduce(v, { type: 'VOTE', playerId: 'c', target: 'c' })).toBe(v);
  });

  it('lets players act only for themselves and only the host steer', () => {
    const s = started();
    expect(imposterRoomAllows(s, { type: 'SEEN', playerId: 'a' }, 'a', 'h')).toBe(true);
    expect(imposterRoomAllows(s, { type: 'SEEN', playerId: 'a' }, 'b', 'h')).toBe(false);
    expect(imposterRoomAllows(s, { type: 'START_VOTE' }, 'a', 'h')).toBe(false);
    expect(imposterRoomAllows(s, { type: 'START_VOTE' }, 'h', 'h')).toBe(true);
  });

  it('keeps the roster for a new round and follows the room only during setup', () => {
    const next = reduce(started(), { type: 'NEW_ROUND' });
    expect(next).toMatchObject({ phase: 'SETUP', players, word: null, imposterIds: [] });
    expect(reduce(started(), { type: 'SETUP', hostId: 'h', players: [] }).players).toEqual(players);
    const setup = reduce(INITIAL_IMPOSTER_ROOM, { type: 'SETUP', hostId: 'h', players });
    // The same roster again changes nothing (no new revision for every render).
    expect(reduce(setup, { type: 'SETUP', hostId: 'h', players: [...players] })).toBe(setup);
  });

  it('draws distinct imposters and always leaves at least one other player', () => {
    expect(drawImposters(['a', 'b', 'c'], 5, () => 0)).toHaveLength(2);
    expect(new Set(drawImposters(['a', 'b', 'c', 'd'], 2)).size).toBe(2);
    expect(mostVoted({})).toBeNull();
  });
});
