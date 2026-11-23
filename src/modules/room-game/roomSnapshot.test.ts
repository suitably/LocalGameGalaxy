import { describe, expect, it } from 'vitest';
import { RoomStatePeer } from './roomPeer';
import { createMemoryTransport } from './roomTransport';
import { loadRoomSnapshot, resumeFrom, saveRoomSnapshot } from './roomSnapshot';

type S = { hostId: string; n: number };
const reducer = (s: S, a: number): S => ({ ...s, n: s.n + a });

describe('room game resume after a host change', () => {
  it('takes the newest started copy and adopts it', () => {
    const a = { state: { hostId: 'h', n: 1 }, rev: 3 };
    const b = { state: { hostId: 'h', n: 2 }, rev: 5 };
    const fresh = { state: { hostId: '', n: 0 }, rev: 0 };
    const resumed = resumeFrom<S>([a, null, b, fresh], (s) => ({ ...s, hostId: 'g' }));
    expect(resumed).toEqual({ state: { hostId: 'g', n: 2 }, rev: 5 });
    expect(resumeFrom<S>([fresh, undefined])).toBeNull();
  });

  it('a snapshot is valid only for its channel and tag', () => {
    saveRoomSnapshot('R', 'kniffel_R', '42', { state: { hostId: 'h', n: 7 }, rev: 9 });
    expect(loadRoomSnapshot<S>('R', 'kniffel_R', '42')).toEqual({
      state: { hostId: 'h', n: 7 },
      rev: 9,
    });
    expect(loadRoomSnapshot<S>('R', 'kniffel_R', '43')).toBeNull();
    expect(loadRoomSnapshot<S>('R', 'knister_R', '42')).toBeNull();
  });

  it('a new host continues from the resumed state and guests keep it', () => {
    const t = createMemoryTransport();
    const saved: number[] = [];
    const guest = new RoomStatePeer<S, number>({
      transport: t,
      channel: 'c',
      playerId: 'x',
      isHost: false,
      reducer,
      initialState: { hostId: '', n: 0 },
      onChange: () => {},
      persist: (h) => saved.push(h.rev),
    });
    guest.start();
    const host = new RoomStatePeer<S, number>({
      transport: t,
      channel: 'c',
      playerId: 'g',
      isHost: true,
      reducer,
      initialState: { hostId: '', n: 0 },
      initialHost: { state: { hostId: 'g', n: 2 }, rev: 5 },
      onChange: () => {},
    });
    host.start();
    expect(guest.current).toEqual({ state: { hostId: 'g', n: 2 }, rev: 5 });
    host.dispatch(3);
    expect(guest.current.rev).toBe(6);
    expect(guest.current.state.n).toBe(5);
    expect(saved).toEqual([5, 6]);
  });
});
