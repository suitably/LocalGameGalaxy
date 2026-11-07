/**
 * Guests follow the host back to the party lobby [ID: HOOK-PARTY-FOLLOW-LOBBY]
 *
 * Mounted by every game played in a party room: when the host ends the game
 * (`universalPartyManager.returnToLobby`), each guest device opens `/party?room=<room>` (#647).
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { universalPartyManager, type PartyRoomState } from '../logic/universalPartyManager';
import { shouldFollowToLobby } from '../logic/lobbyReturn';

export function useFollowPartyLobby(roomId: string | null | undefined, enabled = true): void {
  const navigate = useNavigate();
  useEffect(() => {
    if (!roomId || !enabled || universalPartyManager.isHost(roomId)) return;
    let last: PartyRoomState['status'] | undefined;
    universalPartyManager.subscribeToParty(roomId);
    return universalPartyManager.onPartyUpdate((state) => {
      if (state.roomId !== roomId) return;
      if (shouldFollowToLobby(last, state.status)) navigate(`/party?room=${roomId}`);
      last = state.status;
    });
  }, [roomId, enabled, navigate]);
}
