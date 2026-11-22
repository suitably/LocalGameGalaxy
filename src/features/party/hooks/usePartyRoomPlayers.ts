/**
 * Players of a party room in seat order, for games played in the room; spectators are left out
 * [ID: HOOK-PARTY-ROOM-PLAYERS]
 *
 * The one roster games read (#647 S3): `{ id, name, seat, isHost }` per player, plus `me`. In a
 * Stammtisch only members heard recently are listed (`universalPartyManager.isPresent`).
 * `isHost` is fixed while the game page stays open (the game's state lives in memory on its host),
 * unless the game resumes from a guest copy (`liveHost`, `usePartyRoomGame`).
 */
import { useEffect, useMemo, useState } from 'react';
import { storage, STORAGE_PREFIXES } from '../../../lib/storage';
import { universalPartyManager, type PartyRoomState } from '../logic/universalPartyManager';
import { roomPlayersOf, type RoomPlayer } from '../logic/partyRoster';

export type { RoomPlayer };

const isPresent = (id: string) => universalPartyManager.isPresent(id);

export function usePartyRoomPlayers(roomId: string, { liveHost = false } = {}) {
  const [players, setPlayers] = useState<RoomPlayer[]>(() => {
    const live = universalPartyManager.getRoomState();
    return roomPlayersOf(
      live?.roomId === roomId
        ? live
        : storage.getJson<PartyRoomState | null>(`${STORAGE_PREFIXES.PARTY_STATE}${roomId}`, null),
      isPresent,
    );
  });

  useEffect(() => {
    universalPartyManager.subscribeToParty(roomId);
    return universalPartyManager.onPartyUpdate((state) => {
      if (state.roomId === roomId) setPlayers(roomPlayersOf(state, isPresent));
    });
  }, [roomId]);

  // The role this game page opened with, per room — or, with `liveHost`, the current one: a game
  // that resumes from a guest copy (`useRoomReducer`) can be handed to a new host mid-game.
  const openedAsHost = useMemo(() => universalPartyManager.isHost(roomId), [roomId]);
  const [currentHost, setCurrentHost] = useState(openedAsHost);
  useEffect(() => {
    if (!liveHost) return;
    return universalPartyManager.onPartyUpdate(
      (state) => state.roomId === roomId && setCurrentHost(universalPartyManager.isHost(roomId)),
    );
  }, [roomId, liveHost]);
  const isHost = liveHost ? currentHost : openedAsHost;

  const myId = universalPartyManager.getMyPlayerId();
  return {
    players,
    myId,
    /** This device's player, or `null` while it has no seat (spectator, not joined yet). */
    me: players.find((p) => p.id === myId) ?? null,
    isHost,
  };
}
