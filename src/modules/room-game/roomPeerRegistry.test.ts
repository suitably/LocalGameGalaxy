import { describe, expect, it } from 'vitest';
import { RoomStatePeer } from './roomPeer';
import { createMemoryTransport } from './roomTransport';
import { keptRoomPeerCount, releaseRoomPeers, retainRoomPeer } from './roomPeerRegistry';

type Count = { n: number };
const make = (transport: ReturnType<typeof createMemoryTransport>, isHost: boolean, id: string) =>
  new RoomStatePeer<Count, number>({
    transport,
    channel: 'count_R',
    playerId: id,
    isHost,
    reducer: (s, a) => ({ n: s.n + a }),
    initialState: { n: 0 },
    onChange: () => {},
  });

describe('roomPeerRegistry (#657)', () => {
  it('keeps the host game running while its page is closed, until the room is released', () => {
    const transport = createMemoryTransport();
    const host = retainRoomPeer('count_R|h|host', 'R', () => make(transport, true, 'h'));
    host.start();
    host.dispatch(2);
    // The host's page closes (no stop): a guest still plays against the kept peer.
    const guest = make(transport, false, 'g');
    guest.start();
    guest.dispatch(3);
    expect(host.current).toEqual({ state: { n: 5 }, rev: 2 });
    expect(guest.current.state.n).toBe(5);
    // The host comes back: same peer, same game.
    expect(retainRoomPeer('count_R|h|host', 'R', () => make(transport, true, 'h'))).toBe(host);
    // The game ends: the peer stops and a new page starts fresh.
    releaseRoomPeers('R');
    expect(keptRoomPeerCount()).toBe(0);
    guest.dispatch(1);
    expect(host.current.state.n).toBe(5);
    const fresh = retainRoomPeer('count_R|h|host', 'R', () => make(transport, true, 'h'));
    expect(fresh).not.toBe(host);
    expect(fresh.current.rev).toBe(0);
    releaseRoomPeers('R');
  });
});
