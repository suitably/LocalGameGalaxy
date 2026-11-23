/**
 * `useReducer` shared by everyone in a party room [ID: MOD-ROOM-GAME-HOOK]
 *
 * The host reduces locally and publishes each new state; guests send their actions to the host
 * and render what it publishes. A guest says hello when it opens, and the host answers with the
 * current state, so a reload or late join catches up. Protocol: `RoomStatePeer`; transport:
 * `getRoomTransport(roomId)`, channel `<gameKey>_<roomId>`. With `keepAlive` (default) the peer
 * outlives the page (`roomPeerRegistry.ts`), so the game goes on while a player visits the lobby.
 */
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { RoomHost } from './roomSync';
import { RoomStatePeer } from './roomPeer';
import { getRoomTransport, type RoomTransport } from './roomTransport';
import { retainRoomPeer, takeRoomPeer } from './roomPeerRegistry';
import { loadRoomSnapshot, resumeFrom, saveRoomSnapshot } from './roomSnapshot';

export interface UseRoomReducerOptions<S, A> {
  gameKey: string;
  roomId: string;
  /** This device's player id in the room. */
  playerId: string;
  isHost: boolean;
  reducer: (state: S, action: A) => S;
  /** Host-side check that `from` may perform `action` (e.g. only on their own sheet). */
  authorize?: (state: S, action: A, from: string) => boolean;
  initialState: S;
  /** Defaults to `getRoomTransport(roomId)`. */
  transport?: RoomTransport;
  /** Off: no messages are sent or received (e.g. while the game is not in a room). */
  enabled?: boolean;
  /**
   * Keep the peer (and the game) running after the page closes, until the party releases the
   * room (`releaseRoomPeers`). Default on; off for a game that is not in a party room.
   */
  keepAlive?: boolean;
  /**
   * Set (e.g. to the party's `statusAt`) to keep a snapshot of every state on this device, so a
   * device that becomes host later — even after a restart — continues the game (Stammtisch).
   */
  resumeTag?: string;
  /** Applied to a resumed state when this device takes over as host (e.g. its `hostId`). */
  adoptState?: (state: S) => S;
}

export function useRoomReducer<S, A>({
  gameKey,
  roomId,
  playerId,
  isHost,
  reducer,
  authorize,
  initialState,
  transport,
  enabled = true,
  keepAlive = true,
  resumeTag,
  adoptState,
}: UseRoomReducerOptions<S, A>): {
  state: S;
  /** Revision of the shown state; 0 until the host's first action (a fresh game). */
  rev: number;
  dispatch: (action: A) => void;
  synced: boolean;
} {
  // The peer holds the state; this only re-renders when it changes.
  const [, setView] = useState<RoomHost<S> | null>(null);

  const peer = useMemo(() => {
    const channel = `${gameKey}_${roomId}`;
    const kept = keepAlive && !transport;
    const keyOf = (host: boolean) => `${channel}|${playerId}|${host ? 'host' : 'guest'}`;
    const create = () => {
      // A device that becomes host goes on from the newest state it knows (host change).
      let initialHost = null;
      if (isHost) {
        const guest = kept ? takeRoomPeer<RoomStatePeer<S, A>>(keyOf(false)) : null;
        guest?.stop();
        const snapshot = resumeTag ? loadRoomSnapshot<S>(roomId, channel, resumeTag) : null;
        initialHost = resumeFrom([guest?.current, snapshot], adoptState);
      }
      return new RoomStatePeer<S, A>({
        transport: transport ?? getRoomTransport(roomId),
        channel,
        playerId,
        isHost,
        reducer,
        authorize,
        initialState,
        initialHost,
        persist: resumeTag
          ? (host) => saveRoomSnapshot(roomId, channel, resumeTag, host)
          : undefined,
        onChange: () => {},
      });
    };
    return kept ? retainRoomPeer(keyOf(isHost), roomId, create) : create();
    // A new peer only for a new room, game, player or role; the rest is updated below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey, roomId, playerId, isHost, transport, keepAlive]);
  const kept = keepAlive && !transport;

  useLayoutEffect(() => {
    peer.update({ reducer, authorize, onChange: (host) => setView(host) });
  });

  useEffect(() => {
    if (!enabled) return;
    peer.start();
    return () => {
      // A kept peer goes on without this page (`releaseRoomPeers` ends it).
      if (kept) peer.update({ onChange: () => {} });
      else peer.stop();
    };
  }, [peer, enabled, kept]);

  // A guest keeps asking until the host's first state arrives (the broker may still connect).
  const synced = peer.isSynced;
  useEffect(() => {
    if (!enabled || isHost || synced) return;
    const timer = setInterval(() => peer.hello(), 2000);
    return () => clearInterval(timer);
  }, [enabled, isHost, synced, peer]);

  const dispatch = useMemo(() => (action: A) => peer.dispatch(action), [peer]);
  return { state: peer.current.state, rev: peer.current.rev, dispatch, synced };
}
