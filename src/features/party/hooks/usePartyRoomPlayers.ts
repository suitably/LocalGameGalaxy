/**
 * Players of a party room in seat order, for games played in the room [ID: HOOK-PARTY-ROOM-PLAYERS]
 */
import { useEffect, useState } from 'react';
import { storage, STORAGE_PREFIXES } from '../../../lib/storage';
import { universalPartyManager, type PartyRoomState } from '../logic/universalPartyManager';
import { seatOf } from '../logic/partyRoster';

export interface RoomPlayer {
  id: string;
  name: string;
}

const fromState = (state: PartyRoomState | null): RoomPlayer[] =>
  state
    ? [...state.players]
        .sort((a, b) => seatOf(state.players, a.id) - seatOf(state.players, b.id))
        .map((p) => ({ id: p.id, name: p.name }))
    : [];

export function usePartyRoomPlayers(roomId: string) {
  const [players, setPlayers] = useState<RoomPlayer[]>(() => {
    const live = universalPartyManager.getRoomState();
    return fromState(
      live?.roomId === roomId
        ? live
        : storage.getJson<PartyRoomState | null>(`${STORAGE_PREFIXES.PARTY_STATE}${roomId}`, null),
    );
  });

  useEffect(() => {
    universalPartyManager.subscribeToParty(roomId);
    return universalPartyManager.onPartyUpdate((state) => {
      if (state.roomId === roomId) setPlayers(fromState(state));
    });
  }, [roomId]);

  return {
    players,
    myId: universalPartyManager.getMyPlayerId(),
    isHost: universalPartyManager.isHost(roomId),
  };
}
