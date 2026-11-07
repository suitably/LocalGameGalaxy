/**
 * Players of a party room in seat order, for games played in the room; spectators are left out
 * [ID: HOOK-PARTY-ROOM-PLAYERS]
 *
 * The one roster games read (#647 S3): `{ id, name, seat, isHost }` per player, plus `me`.
 * `isHost` is fixed while the game page stays open: the game's state lives in memory on its host,
 * so a host takeover in the party room must not hand the running game to a device without it.
 */
import { useEffect, useMemo, useState } from 'react';
import { storage, STORAGE_PREFIXES } from '../../../lib/storage';
import { universalPartyManager, type PartyRoomState } from '../logic/universalPartyManager';
import { roomPlayersOf, type RoomPlayer } from '../logic/partyRoster';

export type { RoomPlayer };

export function usePartyRoomPlayers(roomId: string) {
  const [players, setPlayers] = useState<RoomPlayer[]>(() => {
    const live = universalPartyManager.getRoomState();
    return roomPlayersOf(
      live?.roomId === roomId
        ? live
        : storage.getJson<PartyRoomState | null>(`${STORAGE_PREFIXES.PARTY_STATE}${roomId}`, null),
    );
  });

  useEffect(() => {
    universalPartyManager.subscribeToParty(roomId);
    return universalPartyManager.onPartyUpdate((state) => {
      if (state.roomId === roomId) setPlayers(roomPlayersOf(state));
    });
  }, [roomId]);

  // The role this game page opened with, per room.
  const isHost = useMemo(() => universalPartyManager.isHost(roomId), [roomId]);

  const myId = universalPartyManager.getMyPlayerId();
  return {
    players,
    myId,
    /** This device's player, or `null` while it has no seat (spectator, not joined yet). */
    me: players.find((p) => p.id === myId) ?? null,
    isHost,
  };
}
