import { describe, expect, it } from 'vitest';
import {
  createClientPeerTransport,
  createHostPeerTransport,
  type PeerClientLike,
  type PeerHostLike,
} from './peerTransport';
import { RoomStatePeer } from './roomPeer';

type Listener = (data: unknown) => void;

/** A fake phone link; `deliver` simulates a message from the host. */
function fakeClient() {
  const sent: unknown[] = [];
  const listeners = new Set<Listener>();
  const link: PeerClientLike = {
    send: (data) => sent.push(data),
    onMessage: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
  const deliver = (data: unknown) => [...listeners].forEach((fn) => fn(data));
  return { link, sent, deliver };
}

/** A fake host manager with peers; `received` simulates a message from a phone. */
function fakeHost(peers: { peerId: string; deviceId?: string }[]) {
  const toPeer: Record<string, unknown[]> = Object.fromEntries(peers.map((p) => [p.peerId, []]));
  const listeners = new Set<(peerId: string, data: unknown) => void>();
  const manager: PeerHostLike = {
    on: (_event, fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    sendToPeer: (peerId, data) => toPeer[peerId]?.push(data),
    broadcast: (data) => peers.forEach((p) => toPeer[p.peerId].push(data)),
    getConnectedPeers: () => peers,
  };
  const received = (peerId: string, data: unknown) =>
    [...listeners].forEach((fn) => fn(peerId, data));
  return { manager, toPeer, received };
}

const room = (msg: unknown, channel = 'c') => ({ type: 'room', channel, msg });

function collect(t: { subscribe(c: string, fn: (m: unknown) => void): () => void }, c = 'c') {
  const seen: unknown[] = [];
  const unsubscribe = t.subscribe(c, (m) => seen.push(m));
  return { seen, unsubscribe };
}

describe('host peer transport (#814)', () => {
  it('broadcasts to every peer and delivers locally; `to` reaches only the matching peer', () => {
    const h = fakeHost([{ peerId: 'p1', deviceId: 'd1' }, { peerId: 'p2' }]);
    const t = createHostPeerTransport(h.manager, { selfId: 'host' });
    const local = collect(t);

    t.publish('c', { kind: 'state', n: 1 });
    expect(h.toPeer.p1).toEqual([room({ kind: 'state', n: 1 })]);
    expect(h.toPeer.p2).toEqual([room({ kind: 'state', n: 1 })]);

    t.publish('c', { kind: 'reply', to: 'd1' });
    t.publish('c', { kind: 'reply', to: 'p2' }); // no deviceId → peerId is the address
    t.publish('c', { kind: 'reply', to: 'host' }); // the host itself: local only
    expect(h.toPeer.p1).toHaveLength(2);
    expect(h.toPeer.p1[1]).toEqual(room({ kind: 'reply', to: 'd1' }));
    expect(h.toPeer.p2).toHaveLength(2);
    expect(h.toPeer.p2[1]).toEqual(room({ kind: 'reply', to: 'p2' }));
    expect(local.seen).toHaveLength(4);
  });

  it('overwrites a spoofed `from` with the sender’s deviceId, falling back to peerId', () => {
    const h = fakeHost([{ peerId: 'p1', deviceId: 'phone-device' }, { peerId: 'p2' }]);
    const t = createHostPeerTransport(h.manager);
    const local = collect(t);

    h.received('p1', room({ kind: 'action', from: 'admin-device', action: 1 }));
    h.received('p2', room({ kind: 'hello', from: 'admin-device' }));
    h.received('p2', room({ kind: 'ping' })); // no `from` field: unchanged
    expect(local.seen).toEqual([
      { kind: 'action', from: 'phone-device', action: 1 },
      { kind: 'hello', from: 'p2' },
      { kind: 'ping' },
    ]);
    // Never relayed to other phones.
    expect(h.toPeer.p1).toEqual([]);
    expect(h.toPeer.p2).toEqual([]);
  });

  it('ignores non-room messages; unsubscribe and dispose stop delivery', () => {
    const h = fakeHost([{ peerId: 'p1' }]);
    const t = createHostPeerTransport(h.manager);
    const a = collect(t);
    const b = collect(t, 'other');

    h.received('p1', { type: 'identify', from: 'x' });
    h.received('p1', { type: 'room', msg: {} }); // no channel
    h.received('p1', 'room');
    expect(a.seen).toEqual([]);

    h.received('p1', room({ n: 1 }, 'other'));
    expect(b.seen).toEqual([{ n: 1 }]);
    b.unsubscribe();
    h.received('p1', room({ n: 2 }, 'other'));
    expect(b.seen).toHaveLength(1);

    t.dispose();
    h.received('p1', room({ n: 3 }));
    expect(a.seen).toEqual([]);
  });
});

describe('client peer transport (#814)', () => {
  it('sends to the host, delivers locally, and drops events addressed to others', () => {
    const c = fakeClient();
    const t = createClientPeerTransport(c.link, { selfId: 'me' });
    const local = collect(t);

    t.publish('c', { kind: 'action', from: 'me' });
    expect(c.sent).toEqual([room({ kind: 'action', from: 'me' })]);

    c.deliver(room({ kind: 'reply', to: 'someone-else' }));
    c.deliver(room({ kind: 'reply', to: 'me' }));
    c.deliver({ type: 'helper_config' });
    expect(local.seen).toEqual([
      { kind: 'action', from: 'me' },
      { kind: 'reply', to: 'me' },
    ]);

    t.dispose();
    c.deliver(room({ kind: 'state' }));
    expect(local.seen).toHaveLength(2);
  });
});

describe('room state over a fake WebRTC star (#814)', () => {
  type Counter = Record<string, number>;
  type Bump = { player: string };
  const reducer = (s: Counter, a: Bump): Counter => ({ ...s, [a.player]: (s[a.player] ?? 0) + 1 });
  const ownOnly = (_s: Counter, a: Bump, from: string) => a.player === from;

  it('a phone action changes host state and the phone receives the new state', () => {
    // Wire the fakes together: host → phone deliveries and phone → host messages.
    const phone = fakeClient();
    const h = fakeHost([{ peerId: 'p1', deviceId: 'phone' }]);
    const hostSide = h.manager;
    const wired: PeerHostLike = {
      ...hostSide,
      sendToPeer: (peerId, data) => peerId === 'p1' && phone.deliver(data),
      broadcast: (data) => phone.deliver(data),
    };
    const phoneLink: PeerClientLike = {
      ...phone.link,
      send: (data) => h.received('p1', data),
    };

    const opts = { channel: 'melodiq_R', reducer, authorize: ownOnly, initialState: {} };
    const host = new RoomStatePeer<Counter, Bump>({
      ...opts,
      transport: createHostPeerTransport(wired, { selfId: 'host' }),
      playerId: 'host',
      isHost: true,
      onChange: () => {},
    });
    const guest = new RoomStatePeer<Counter, Bump>({
      ...opts,
      transport: createClientPeerTransport(phoneLink, { selfId: 'phone' }),
      playerId: 'phone',
      isHost: false,
      onChange: () => {},
    });
    host.start();
    guest.start(); // hello → host answers with rev 0 (a fresh game is not "synced" yet)

    guest.dispatch({ player: 'phone' });
    expect(host.current).toEqual({ state: { phone: 1 }, rev: 1 });
    expect(guest.current).toEqual({ state: { phone: 1 }, rev: 1 });
    expect(guest.isSynced).toBe(true);

    // The host's authorize sees the stamped device id, so a foreign action is refused.
    guest.dispatch({ player: 'host' });
    expect(host.current.rev).toBe(1);
  });
});
