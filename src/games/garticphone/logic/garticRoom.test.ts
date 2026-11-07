import { describe, expect, it } from 'vitest';
import { RoomStatePeer, createMemoryTransport } from '../../../modules/room-game';
import { createInitialGarticState } from '../garticEngine';
import type { GarticGameState } from '../types';
import {
  emptyGarticState,
  garticRoomAllows,
  garticRoomReducer,
  type GarticRoomAction,
} from './garticRoom';

const players = ['h', 'a', 'b'].map((id) => ({ id, name: id.toUpperCase(), ready: true }));
const start = () => createInitialGarticState('h', 'H', 'ROOM', players.slice(0, 2));

function peer(t: ReturnType<typeof createMemoryTransport>, id: string, isHost: boolean) {
  return new RoomStatePeer<GarticGameState, GarticRoomAction>({
    transport: t,
    channel: 'garticphone_ROOM',
    playerId: id,
    isHost,
    reducer: garticRoomReducer,
    authorize: garticRoomAllows,
    initialState: isHost ? start() : emptyGarticState('ROOM'),
    onChange: () => {},
  });
}

describe('garticRoomReducer', () => {
  it('joins a player once and applies submits', () => {
    let s = garticRoomReducer(start(), { type: 'join', player: players[2] });
    s = garticRoomReducer(s, { type: 'join', player: players[2] });
    expect(s.players).toHaveLength(3);
    s = garticRoomReducer(s, { type: 'stepSubmit', playerId: 'a', content: 'cat' });
    expect(s.books.find((b) => b.ownerId === 'a')?.steps).toHaveLength(1);
  });

  it('forceEnd goes to lobby, restart starts over', () => {
    const ended = garticRoomReducer(start(), { type: 'forceEnd' });
    expect(ended.phase).toBe('lobby');
    expect(garticRoomReducer(ended, { type: 'restart' }).phase).toBe('prompt');
  });

  it('authorizes only own submits and host-only controls', () => {
    const s = start();
    const submit: GarticRoomAction = { type: 'stepSubmit', playerId: 'a', content: 'x' };
    expect(garticRoomAllows(s, submit, 'a')).toBe(true);
    expect(garticRoomAllows(s, submit, 'b')).toBe(false);
    expect(garticRoomAllows(s, { type: 'forceEnd' }, 'a')).toBe(false);
    expect(garticRoomAllows(s, { type: 'join', player: players[2] }, 'a')).toBe(false);
    expect(garticRoomAllows(s, { type: 'restart' }, 'h')).toBe(true);
  });
});

describe('Gartic round over RoomStatePeer', () => {
  it('host + 2 guests finish a round to the reveal', () => {
    const t = createMemoryTransport();
    const host = peer(t, 'h', true);
    host.start();
    host.dispatch({ type: 'restart' });
    const a = peer(t, 'a', false);
    a.start();
    const b = peer(t, 'b', false);
    b.start();
    expect(b.isSynced).toBe(true);
    host.dispatch({ type: 'join', player: players[2] }); // host joins roster players
    expect(a.current.state.players).toHaveLength(3);

    // a guest cannot submit for somebody else
    b.dispatch({ type: 'stepSubmit', playerId: 'a', content: 'fake' });
    expect(host.current.state.books.every((bk) => bk.steps.length === 0)).toBe(true);

    for (let round = 0; round < 3; round++) {
      host.dispatch({ type: 'stepSubmit', playerId: 'h', content: `h${round}` });
      a.dispatch({ type: 'stepSubmit', playerId: 'a', content: `a${round}` });
      b.dispatch({ type: 'stepSubmit', playerId: 'b', content: `b${round}` });
    }
    expect(host.current.state.phase).toBe('reveal');
    expect(b.current.state.phase).toBe('reveal');
    expect(a.current.state.books.every((bk) => bk.steps.length === 3)).toBe(true);
  });
});
