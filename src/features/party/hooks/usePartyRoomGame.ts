/**
 * A dice game played in a party room, everyone on their own device [ID: HOOK-PARTY-ROOM-GAME]
 *
 * What Knister, Kniffel and Qwixx share in a room: the roster (`usePartyRoomPlayers`), the host's
 * reducer over the room transport (`useRoomReducer`), guests following the host to the lobby,
 * the header back arrow to the lobby, and the host dealing once the players are known.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHeaderLayout } from '../../../context/HeaderLayoutContext';
import { useWakeLock } from '../../../hooks/useWakeLock';
import { useRoomReducer } from '../../../modules/room-game';
import { useFollowPartyLobby } from './useFollowPartyLobby';
import { usePartyRoomPlayers, type RoomPlayer } from './usePartyRoomPlayers';

interface Options<S, A> {
  gameKey: string;
  roomId: string;
  reducer: (state: S, action: A) => S;
  authorize: (state: S, action: A, from: string) => boolean;
  initialState: S;
  /** True while the host still has to deal (no players in the game state yet). */
  needsStart: (state: S) => boolean;
  /** The host's start action for the room's players. */
  start: (hostId: string, players: RoomPlayer[]) => A;
}

export function usePartyRoomGame<S, A>({
  gameKey,
  roomId,
  reducer,
  authorize,
  initialState,
  needsStart,
  start,
}: Options<S, A>) {
  const navigate = useNavigate();
  useFollowPartyLobby(roomId);
  useWakeLock(true);
  const room = usePartyRoomPlayers(roomId);
  const game = useRoomReducer<S, A>({
    gameKey,
    roomId,
    playerId: room.myId,
    isHost: room.isHost,
    reducer,
    authorize,
    initialState,
  });
  const { state, dispatch } = game;

  // The host deals once the room's players are known.
  const roster = room.players;
  const dealt = !needsStart(state);
  useEffect(() => {
    if (room.isHost && !dealt && roster.length > 0) dispatch(start(room.myId, roster));
  }, [room.isHost, room.myId, roster, dealt, dispatch, start]);

  // Header back arrow = party lobby; the game goes on while this device visits it (#657).
  const { setHomeAction } = useHeaderLayout();
  useEffect(() => {
    setHomeAction(() => navigate(`/party?room=${roomId}`));
    return () => setHomeAction(null);
  }, [navigate, roomId, setHomeAction]);

  return { room, ...game };
}
