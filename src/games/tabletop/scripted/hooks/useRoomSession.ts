/**
 * A scripted card game in a party room [ID: HOOK-TABLETOP-SCRIPT-ROOM]
 *
 * The party host runs `sessionReducer` (`modules/room-game`); every other device sends its moves
 * and renders the host's state. The host keeps the game across reloads.
 */
import { useEffect, useMemo } from 'react';
import { useRoomReducer } from '../../../../modules/room-game';
import { usePartyRoomPlayers } from '../../../../features/party/hooks/usePartyRoomPlayers';
import {
  emptySession,
  sessionAllows,
  sessionReducer,
  type SessionAction,
  type SessionState,
} from '../logic/session';
import { loadSession, saveSession } from '../logic/sessionStore';

export function useRoomSession(scriptId: string, roomId: string) {
  const room = usePartyRoomPlayers(roomId);
  const initialState = useMemo(
    () => (room.isHost ? loadSession(scriptId, roomId) : emptySession(scriptId)),
    [room.isHost, scriptId, roomId],
  );
  const { state, dispatch, synced } = useRoomReducer<SessionState, SessionAction>({
    gameKey: `cards-${scriptId}`,
    roomId,
    playerId: room.myId,
    isHost: room.isHost,
    reducer: sessionReducer,
    authorize: (current, action, from) => sessionAllows(current, action, from, room.myId),
    initialState,
  });
  useEffect(() => {
    if (room.isHost) saveSession(roomId, state);
  }, [room.isHost, roomId, state]);

  const seat = state.players.findIndex((p) => p.id === room.myId);
  return { room, state, dispatch, synced, seat: seat >= 0 ? seat : null };
}
