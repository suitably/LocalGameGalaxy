import { describe, expect, it } from 'vitest';
import { createMemoryTransport } from '../../../modules/room-game';
import { SealedRoomPeer } from '../../../modules/room-game/sealed/sealedRoomPeer';
import {
  INITIAL_WEREWOLF_ROOM,
  werewolfRoomAllows,
  werewolfRoomReducer,
  type WerewolfRoomAction,
  type WerewolfRoomState,
} from './werewolfRoom';
import { werewolfRoomView, type WerewolfRoomView } from './werewolfRoomView';

const GAME = {
  reducer: werewolfRoomReducer,
  allows: werewolfRoomAllows,
  playerIds: (s: WerewolfRoomState) => s.game.players.map((p) => p.id),
  viewFor: werewolfRoomView,
};
type Peer = SealedRoomPeer<WerewolfRoomState, WerewolfRoomAction, WerewolfRoomView>;
const players = ['h', 'a', 'b', 'c', 'd'].map((id) => ({ id, name: id }));

const peer = (t: ReturnType<typeof createMemoryTransport>, id: string, isHost: boolean): Peer =>
  new SealedRoomPeer(GAME, {
    transport: t,
    channel: 'ww',
    playerId: id,
    isHost,
    initialState: INITIAL_WEREWOLF_ROOM,
    onChange: () => {},
  });
const settle = async (...peers: Peer[]) => {
  for (let i = 0; i < 4; i++) for (const p of peers) await p.idle();
};

describe('werewolf in a sealed party room', () => {
  it('gives each phone only its own role; roles never travel in clear', async () => {
    const t = createMemoryTransport();
    const wire: string[] = [];
    t.subscribe('ww', (m) => wire.push(JSON.stringify(m)));
    const host = peer(t, 'h', true);
    const guests = ['a', 'b', 'c', 'd'].map((id) => peer(t, id, false));
    const all = [host, ...guests];
    for (const p of all) p.start();
    await settle(...all);
    host.dispatch({ type: 'SETUP', hostId: 'h', players });
    // The host only narrates: four seats.
    host.dispatch({
      type: 'START',
      roles: ['WEREWOLF', 'SEER', 'VILLAGER', 'VILLAGER'],
      narrator: true,
    });
    await settle(...all);

    expect(host.current?.me).toBeNull();
    const roles = guests.map((g) => g.current?.me?.role).sort();
    expect(roles).toEqual(['SEER', 'VILLAGER', 'VILLAGER', 'WEREWOLF']);
    expect(wire.join('')).not.toMatch(/SEER|WEREWOLF/);

    // A guest may confirm only its own card.
    guests[0].dispatch({ type: 'SEEN', playerId: 'b' });
    guests[0].dispatch({ type: 'SEEN', playerId: 'a' });
    await settle(...all);
    expect(host.current?.seenCount).toBe(1);
  });
});
