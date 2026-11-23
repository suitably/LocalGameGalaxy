import { describe, expect, it } from 'vitest';
import { createMemoryTransport } from '../../../../modules/room-game';
import { SealedRoomPeer } from '../../../../modules/room-game/sealed/sealedRoomPeer';
import {
  INITIAL_IMPOSTER_ROOM,
  imposterRoomAllows,
  imposterRoomReducer,
  imposterRoomView,
  type ImposterRoomAction,
  type ImposterRoomState,
  type ImposterRoomView,
} from '../imposterRoom';

const GAME = {
  reducer: imposterRoomReducer,
  allows: imposterRoomAllows,
  playerIds: (s: ImposterRoomState) => s.players.map((p) => p.id),
  viewFor: imposterRoomView,
};
type Peer = SealedRoomPeer<ImposterRoomState, ImposterRoomAction, ImposterRoomView>;
const players = ['h', 'a', 'b'].map((id) => ({ id, name: id }));

const peer = (t: ReturnType<typeof createMemoryTransport>, id: string, isHost: boolean): Peer =>
  new SealedRoomPeer(GAME, {
    transport: t,
    channel: 'imp',
    playerId: id,
    isHost,
    initialState: INITIAL_IMPOSTER_ROOM,
    onChange: () => {},
  });
const settle = async (...peers: Peer[]) => {
  for (let i = 0; i < 4; i++) for (const p of peers) await p.idle();
};

describe('imposter in a sealed party room', () => {
  it('gives each phone only its own card; word and imposter never travel in clear', async () => {
    const t = createMemoryTransport();
    const wire: string[] = [];
    t.subscribe('imp', (m) => wire.push(JSON.stringify(m)));
    const host = peer(t, 'h', true);
    const a = peer(t, 'a', false);
    const b = peer(t, 'b', false);
    for (const p of [host, a, b]) p.start();
    await settle(host, a, b);
    host.dispatch({ type: 'SETUP', hostId: 'h', players });
    host.dispatch({
      type: 'START',
      word: 'Zebrastreifen',
      hint: 'Verkehr',
      imposterIds: ['b'],
      timerLength: 60,
    });
    await settle(host, a, b);

    expect(a.current?.me).toMatchObject({ imposter: false, clue: 'Zebrastreifen' });
    expect(b.current?.me).toMatchObject({ imposter: true, clue: 'Verkehr' });
    expect(wire.join('')).not.toMatch(/Zebrastreifen|Verkehr/);

    // A guest may confirm only its own card; the host counts it.
    a.dispatch({ type: 'SEEN', playerId: 'b' });
    a.dispatch({ type: 'SEEN', playerId: 'a' });
    await settle(host, a, b);
    expect(host.current?.seenCount).toBe(1);
  });
});
