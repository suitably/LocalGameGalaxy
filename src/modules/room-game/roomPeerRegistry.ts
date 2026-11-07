/**
 * Room peers that outlive their game page [ID: MOD-ROOM-GAME-REGISTRY]
 *
 * A player may leave a running game for the party lobby and come back (#657). The game's state
 * lives in its `RoomStatePeer` (on the host: the only copy), so `useRoomReducer` keeps one peer
 * per channel, player and role here instead of stopping it on unmount. The host's peer keeps
 * answering guests and applying their actions while the host is in the lobby. Peers end with
 * their game: the party calls `releaseRoomPeers(roomId)` when a game is launched or ended.
 */
import type { RoomStatePeer } from './roomPeer';

interface Entry {
  roomId: string;
  peer: { stop(): void };
}

const peers = new Map<string, Entry>();

/** The kept peer for `key`, or a new one from `create` that is kept from now on. */
export function retainRoomPeer<S, A>(
  key: string,
  roomId: string,
  create: () => RoomStatePeer<S, A>,
): RoomStatePeer<S, A> {
  const found = peers.get(key);
  if (found) return found.peer as RoomStatePeer<S, A>;
  const peer = create();
  peers.set(key, { roomId, peer });
  return peer;
}

/** Stops and forgets every kept peer of a room (its game ended or a new one starts). */
export function releaseRoomPeers(roomId: string): void {
  for (const [key, entry] of peers) {
    if (entry.roomId !== roomId) continue;
    entry.peer.stop();
    peers.delete(key);
  }
}

/** Number of kept peers (tests). */
export function keptRoomPeerCount(): number {
  return peers.size;
}
