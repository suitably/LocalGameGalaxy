/**
 * Gartic Phone Game State Hook [ID: GARTIC-HOOK-GAMESTATE]
 *
 * Runs the game on the shared room transport (`useRoomReducer`, gameKey `garticphone`): the
 * party host applies every action, guests send theirs and render the host's state. The roster
 * comes from `usePartyRoomPlayers`.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createInitialGarticState, getPlayerTaskForRound } from '../garticEngine';
import { emptyGarticState, garticRoomAllows, garticRoomReducer } from '../logic/garticRoom';
import type { GarticRoomAction } from '../logic/garticRoom';
import { parseGameUrlParams } from '../../../modules/sharing';
import { useRoomReducer } from '../../../modules/room-game';
import { usePartyRoomPlayers } from '../../../features/party/hooks/usePartyRoomPlayers';
import { universalPartyManager } from '../../../features/party/logic/universalPartyManager';
import { getOrCreatePlayerName } from '../../../features/party/logic/playerName';
import type { GarticGameState, GarticPlayer } from '../types';

interface UseGarticGameStateOptions {
  initialRoomId?: string;
}

/** Without a room code the game runs on this device only (the device is its own host). */
const LOCAL_ROOM = 'LOCAL';

export function useGarticGameState({ initialRoomId }: UseGarticGameStateOptions = {}) {
  const roomId = useMemo(() => {
    const params = parseGameUrlParams();
    const room = params.get('room') || params.get('roomId') || initialRoomId;
    return room?.toUpperCase().trim() || universalPartyManager.getRoomState()?.roomId || LOCAL_ROOM;
  }, [initialRoomId]);

  const room = usePartyRoomPlayers(roomId);
  const myPlayerId = room.myId;
  const myPlayerName = room.me?.name ?? getOrCreatePlayerName();
  const isHost = roomId === LOCAL_ROOM || room.isHost;

  // The host's roster is read once; later arrivals are joined below.
  const [initialState] = useState<GarticGameState>(() => {
    if (!isHost) return emptyGarticState(roomId);
    const roster: GarticPlayer[] = room.players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      ready: true,
    }));
    const activeGameId = universalPartyManager.getRoomState()?.gameId || undefined;
    return createInitialGarticState(myPlayerId, myPlayerName, roomId, roster, activeGameId);
  });

  const {
    state: gameState,
    rev,
    dispatch,
    synced,
  } = useRoomReducer<GarticGameState, GarticRoomAction>({
    gameKey: 'garticphone',
    roomId,
    playerId: myPlayerId,
    isHost,
    reducer: garticRoomReducer,
    authorize: garticRoomAllows,
    initialState,
    // A party game goes on while players visit the lobby (#657); a local one ends with its page.
    keepAlive: roomId !== LOCAL_ROOM,
  });

  // The host's first action: it gives the state revision 1, which guests then accept. A host
  // that comes back from the lobby finds its running game (rev > 0) and must not deal again.
  const dealt = useRef(false);
  useEffect(() => {
    if (!isHost || dealt.current) return;
    dealt.current = true;
    if (rev === 0) dispatch({ type: 'restart' });
  }, [isHost, rev, dispatch]);

  const roster = room.players;
  useEffect(() => {
    if (!isHost) return;
    roster
      .filter((p) => !gameState.players.some((g) => g.id === p.id))
      .forEach((p) =>
        dispatch({
          type: 'join',
          player: { id: p.id, name: p.name, isHost: p.isHost, ready: true },
        }),
      );
  }, [isHost, roster, gameState.players, dispatch]);

  const myPlayer = gameState.players.find((p) => p.id === myPlayerId);
  const { taskType, previousStep, hasSubmitted } = getPlayerTaskForRound(gameState, myPlayerId);

  return {
    gameState,
    synced,
    roomId,
    myPlayerId,
    myPlayerName,
    myPlayer,
    isHost,
    taskType,
    previousStep,
    hasSubmitted,
    submitStep: (content: string) =>
      dispatch({ type: 'stepSubmit', playerId: myPlayerId, content }),
    restartGame: () => dispatch({ type: 'restart' }),
    updateRevealState: (bookIndex: number, stepIndex: number) =>
      dispatch({ type: 'reveal', bookIndex, stepIndex }),
    /** Host: ends the round for everyone and reopens the lobby. */
    endGame: () => {
      dispatch({ type: 'forceEnd' });
      universalPartyManager.returnToLobby(roomId);
    },
  };
}
