/**
 * A party-room game with secrets: each device holds only its own view [ID: HOOK-PARTY-SEALED-GAME]
 *
 * The sealed counterpart of `usePartyRoomGame`: the host runs the game in a `SealedRoomPeer`
 * (kept across lobby visits by `retainRoomPeer`), guests send actions and receive the view sealed
 * for their seat. Shares the roster, following the host to the lobby, the wake lock and the
 * header back arrow with the other room games.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHeaderLayout } from '../../../context/HeaderLayoutContext';
import { useWakeLock } from '../../../hooks/useWakeLock';
import { getRoomTransport, retainRoomPeer } from '../../../modules/room-game';
import { SealedRoomPeer, type SealedGame } from '../../../modules/room-game/sealed/sealedRoomPeer';
import { useFollowPartyLobby } from './useFollowPartyLobby';
import { usePartyRoomPlayers } from './usePartyRoomPlayers';

interface Options<S, A, V> {
  gameKey: string;
  roomId: string;
  game: SealedGame<S, A, V>;
  initialState: S;
}

export function useSealedPartyGame<S, A, V>({
  gameKey,
  roomId,
  game,
  initialState,
}: Options<S, A, V>) {
  const navigate = useNavigate();
  useFollowPartyLobby(roomId);
  useWakeLock(true);
  const room = usePartyRoomPlayers(roomId);
  const [, setTick] = useState(0);

  const peer = useMemo(() => {
    const channel = `${gameKey}-sealed_${roomId}`;
    return retainRoomPeer(
      `${channel}|${room.myId}|${room.isHost ? 'host' : 'guest'}|sealed`,
      roomId,
      () =>
        new SealedRoomPeer<S, A, V>(game, {
          transport: getRoomTransport(roomId),
          channel,
          playerId: room.myId,
          isHost: room.isHost,
          initialState,
          onChange: () => {},
        }),
    );
  }, [gameKey, roomId, room.myId, room.isHost, game, initialState]);

  useEffect(() => {
    peer.update({ onChange: () => setTick((n) => n + 1) });
    peer.start();
    // A kept peer goes on without this page (`releaseRoomPeers` ends it).
    return () => peer.update({ onChange: () => {} });
  }, [peer]);

  const synced = peer.isSynced;
  // A guest keeps asking until the host's first views arrive (the broker may still connect).
  useEffect(() => {
    if (room.isHost || synced) return;
    const timer = setInterval(() => void peer.hello(), 2000);
    return () => clearInterval(timer);
  }, [room.isHost, synced, peer]);

  // Header back arrow = party lobby; the game goes on while this device visits it (#657).
  const { setHomeAction } = useHeaderLayout();
  useEffect(() => {
    setHomeAction(() => navigate(`/party?room=${roomId}`));
    return () => setHomeAction(null);
  }, [navigate, roomId, setHomeAction]);

  const dispatch = useCallback((action: A) => peer.dispatch(action), [peer]);
  return { room, view: peer.current, dispatch, synced };
}
