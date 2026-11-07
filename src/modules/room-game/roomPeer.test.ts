import { describe, expect, it } from 'vitest';
import { RoomStatePeer } from './roomPeer';
import { createMemoryTransport, getRoomTransport, setRoomTransportFactory } from './roomTransport';

type Sheet = Record<string, number>;
type Add = { player: string; n: number };
const reducer = (s: Sheet, a: Add): Sheet => ({ ...s, [a.player]: (s[a.player] ?? 0) + a.n });
const ownSheetOnly = (_s: Sheet, a: Add, from: string) => a.player === from;

function peer(
  transport: ReturnType<typeof createMemoryTransport>,
  playerId: string,
  isHost: boolean,
) {
  const seen: number[] = [];
  const p = new RoomStatePeer<Sheet, Add>({
    transport,
    channel: 'test_R1',
    playerId,
    isHost,
    reducer,
    authorize: ownSheetOnly,
    initialState: {},
    onChange: (h) => seen.push(h.rev),
  });
  return { p, seen };
}

describe('RoomStatePeer over an in-memory RoomTransport (#647 S4)', () => {
  it('host state reaches a guest with rev, and authorize guards foreign actions', () => {
    const t = createMemoryTransport();
    const host = peer(t, 'h', true);
    host.p.start();
    host.p.dispatch({ player: 'h', n: 2 });

    const guest = peer(t, 'g', false);
    guest.p.start(); // hello → host answers with rev 1
    expect(guest.p.isSynced).toBe(true);
    expect(guest.p.current).toEqual({ state: { h: 2 }, rev: 1 });

    guest.p.dispatch({ player: 'g', n: 5 });
    expect(host.p.current).toEqual({ state: { h: 2, g: 5 }, rev: 2 });
    expect(guest.p.current.rev).toBe(2);

    guest.p.dispatch({ player: 'h', n: 9 }); // not the guest's sheet
    expect(host.p.current.rev).toBe(2);
    expect(guest.seen).toEqual([1, 2]);
  });

  it('a guest ignores a stale state', () => {
    const t = createMemoryTransport();
    const guest = peer(t, 'g', false);
    guest.p.start();
    t.publish('test_R1', { kind: 'state', from: 'h', rev: 3, state: { h: 3 } });
    t.publish('test_R1', { kind: 'state', from: 'h', rev: 2, state: { h: 1 } });
    expect(guest.p.current).toEqual({ state: { h: 3 }, rev: 3 });
  });

  it('getRoomTransport follows the factory and can be restored', () => {
    const t = createMemoryTransport();
    const before = getRoomTransport('R1');
    const restore = setRoomTransportFactory(() => t);
    expect(getRoomTransport('R1')).toBe(t);
    restore();
    expect(getRoomTransport('R1')).toBe(before);
  });
});
