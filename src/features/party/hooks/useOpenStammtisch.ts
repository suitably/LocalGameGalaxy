/**
 * Opens a saved Stammtisch [ID: HOOK-PARTY-OPEN-STAMMTISCH]
 *
 * Restores the room key and this device's player id for the room, then opens its lobby. Used by
 * the hub's Stammtisch list and by the auto-open on app start.
 */
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { setRoomKey } from '../../../modules/sync/roomKeys';
import { universalPartyManager } from '../logic/universalPartyManager';
import type { StammtischRoom } from '../logic/stammtisch';

export function useOpenStammtisch(): (room: StammtischRoom) => void {
  const navigate = useNavigate();
  return useCallback(
    (room: StammtischRoom) => {
      if (room.roomKey) setRoomKey(room.roomId, room.roomKey, 'session');
      universalPartyManager.adoptPlayerId(room.playerId);
      navigate(`/party?room=${encodeURIComponent(room.roomId)}`);
    },
    [navigate],
  );
}
