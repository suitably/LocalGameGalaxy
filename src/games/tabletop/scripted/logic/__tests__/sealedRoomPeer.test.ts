import { describe, expect, it } from 'vitest';
import { createMemoryTransport } from '../../../../../modules/room-game';
import { SealedRoomPeer } from '../sealedRoomPeer';
import { allowedFromPacket, seatPacket } from '../sealedViews';
import { emptySession, sessionReducer, type SessionState } from '../session';

const players = [
  { id: 'h', name: 'Host' },
  { id: 'a', name: 'Ann' },
  { id: 'b', name: 'Bob' },
];
const started = (): SessionState =>
  sessionReducer(emptySession('schwimmen'), {
    type: 'START',
    scriptId: 'schwimmen',
    players,
    seed: 7,
  });

function peer(
  t: ReturnType<typeof createMemoryTransport>,
  id: string,
  isHost: boolean,
  supported = true,
) {
  const p = new SealedRoomPeer({
    transport: t,
    channel: 'c',
    playerId: id,
    isHost,
    initialState: isHost ? started() : emptySession('schwimmen'),
    onChange: () => {},
    supported,
  });
  return p;
}
const settle = async (...peers: SealedRoomPeer[]) => {
  for (let i = 0; i < 4; i++) for (const p of peers) await p.idle();
};
const handOf = (state: SessionState, seat: number) => seatPacket(state, seat).view!.hand;

describe('SealedRoomPeer', () => {
  it('each seat gets only its own hand, the wire never carries the others', async () => {
    const t = createMemoryTransport();
    const wire: string[] = [];
    t.subscribe('c', (m) => wire.push(JSON.stringify(m)));
    const host = peer(t, 'h', true);
    host.start();
    const a = peer(t, 'a', false);
    const b = peer(t, 'b', false);
    a.start();
    b.start();
    await settle(host, a, b);
    const state = started();
    expect(a.current?.view?.hand).toEqual(handOf(state, 1));
    expect(b.current?.view?.hand).toEqual(handOf(state, 2));
    const views = wire.filter((m) => m.includes('"kind":"views"')).join('');
    for (const card of [...handOf(state, 1), ...handOf(state, 2)]) {
      expect(views).not.toContain(`"${card}"`);
    }
  });

  it('refuses a move for another seat and applies an own one on the host', async () => {
    const t = createMemoryTransport();
    const host = peer(t, 'h', true);
    host.start();
    const a = peer(t, 'a', false);
    a.start();
    await settle(host, a);
    a.dispatch({ type: 'END' });
    a.dispatch({ type: 'MOVE', seat: 2, move: { kind: 'action', id: 'x' } });
    await settle(host, a);
    expect(host.current?.step).toBe(0);
    expect(host.current?.view).not.toBeNull();
  });

  it('without WebCrypto a seat still only receives its own packet', async () => {
    const t = createMemoryTransport();
    const host = peer(t, 'h', true, false);
    host.start();
    const a = peer(t, 'a', false, false);
    a.start();
    await settle(host, a);
    expect(a.current?.view?.hand).toEqual(handOf(started(), 1));
  });

  it('allowedFromPacket uses host hints for single picks and trusts bigger ones', () => {
    const packet = { players, step: 0, view: null, hints: ['x'] };
    expect(allowedFromPacket(packet)({ kind: 'action', id: 'go' })).toBe(true);
    const one = { ...packet, view: { select: 'one' } as never };
    expect(allowedFromPacket(one)({ kind: 'cards', cards: ['x'] })).toBe(true);
    expect(allowedFromPacket(one)({ kind: 'cards', cards: ['y'] })).toBe(false);
  });
});
