import { describe, expect, it } from 'vitest';
import type { RemotePeerBase } from './WebRTCHostManager';
import { applyPeerConnected, applyPeerCreated, applyPeerUpdated } from './peerListUpdates';

type Peer = RemotePeerBase & { peerId: string };

const peers = (): Peer[] =>
  [
    { peerId: 'a', name: 'A', deviceId: 'd1', connectionId: 'c1' },
    { peerId: 'b', name: 'B', deviceId: 'd2' },
  ] as Peer[];

describe('peerListUpdates', () => {
  it('connected replaces identity and drops stale peers of the same device', () => {
    const next = applyPeerConnected(peers(), 'c', 'C', 5, 'c9', 'd1');
    expect(next.map((p) => p.peerId)).toEqual(['b']);
    const known = applyPeerConnected(peers(), 'a', 'A2', 1, undefined, 'd1');
    expect(known[0]).toMatchObject({ peerId: 'a', name: 'A2', hue: 1, connectionId: undefined });
  });

  it('updated keeps existing connection and device ids when not provided', () => {
    const next = applyPeerUpdated(peers(), 'a', 'A2');
    expect(next[0]).toMatchObject({ name: 'A2', connectionId: 'c1', deviceId: 'd1' });
  });

  it('created adds new peers, ignores known ids and replaces same-device peers', () => {
    const base = peers();
    expect(applyPeerCreated(base, 'a', { peerId: 'a' } as Peer)).toBe(base);
    expect(applyPeerCreated(base, 'x', { peerId: 'x' } as Peer)).toHaveLength(3);
    const replaced = applyPeerCreated(base, 'x', { peerId: 'x', deviceId: 'd2' } as Peer);
    expect(replaced.map((p) => p.peerId)).toEqual(['a', 'x']);
  });
});
