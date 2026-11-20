/**
 * A scripted card game in a party room [ID: HOOK-TABLETOP-SCRIPT-ROOM]
 *
 * The party host runs `sessionReducer` in a `SealedRoomPeer` and keeps the game across reloads
 * and lobby visits (`retainRoomPeer`). Every other device sends its moves and only ever holds
 * the packet the host sealed for its seat (Q24), never the whole state.
 */
import { useEffect, useMemo, useState } from 'react';
import { getRoomTransport, retainRoomPeer } from '../../../../modules/room-game';
import { usePartyRoomPlayers } from '../../../../features/party/hooks/usePartyRoomPlayers';
import { SealedRoomPeer } from '../logic/sealedRoomPeer';
import { allowedFromPacket } from '../logic/sealedViews';
import { emptySession, type SessionAction } from '../logic/session';
import { loadSession, saveSession } from '../logic/sessionStore';

export function useRoomSession(scriptId: string, roomId: string) {
  const room = usePartyRoomPlayers(roomId);
  const [, setTick] = useState(0);
  const peer = useMemo(() => {
    const channel = `cards-${scriptId}_${roomId}`;
    return retainRoomPeer(
      `${channel}|${room.myId}|${room.isHost ? 'host' : 'guest'}|sealed`,
      roomId,
      () =>
        new SealedRoomPeer({
          transport: getRoomTransport(roomId),
          channel,
          playerId: room.myId,
          isHost: room.isHost,
          initialState: room.isHost ? loadSession(scriptId, roomId) : emptySession(scriptId),
          onChange: () => {},
        }),
    );
  }, [scriptId, roomId, room.myId, room.isHost]);

  useEffect(() => {
    peer.update({
      onChange: () => setTick((n) => n + 1),
      onState: room.isHost ? (state) => saveSession(roomId, state) : undefined,
    });
    peer.start();
    // A kept peer goes on without this page (`releaseRoomPeers` ends it).
    return () => peer.update({ onChange: () => {} });
  }, [peer, room.isHost, roomId]);

  const packet = peer.current;
  const synced = peer.isSynced;
  // A guest keeps asking until the host's first views arrive (the broker may still connect).
  useEffect(() => {
    if (room.isHost || synced) return;
    const timer = setInterval(() => void peer.hello(), 2000);
    return () => clearInterval(timer);
  }, [room.isHost, synced, peer]);

  const players = packet?.players ?? [];
  const seat = players.findIndex((p) => p.id === room.myId);
  const allowed = useMemo(() => (packet ? allowedFromPacket(packet) : () => false), [packet]);
  return {
    room,
    packet,
    dispatch: (action: SessionAction) => peer.dispatch(action),
    synced,
    seat: seat >= 0 ? seat : null,
    allowed,
  };
}
