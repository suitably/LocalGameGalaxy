/**
 * Hook for returning to the Universal Party Lobby [ID: HOOK-TABLETOP-PARTY-RETURN]
 */
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { universalPartyManager } from '../../../features/party/logic/universalPartyManager';

export function usePartyLobbyReturn(roomId: string | null) {
  const navigate = useNavigate();

  const returnToLobby = useCallback(() => {
    if (!roomId) {
      navigate('/party');
      return;
    }
    universalPartyManager.returnToLobby(roomId);
    navigate(`/party?room=${roomId}`);
  }, [roomId, navigate]);

  return { returnToLobby };
}
