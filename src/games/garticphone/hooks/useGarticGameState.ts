/**
 * Gartic Phone Game State Hook [ID: GARTIC-HOOK-GAMESTATE]
 *
 * Encapsulates game state management, player resolution, phase transitions,
 * round task calculations, and safe session storage persistence.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  createInitialGarticState,
  getPlayerTaskForRound,
  startGarticGame,
  submitPlayerGarticStep,
  addPlayerToGarticGame,
} from '../garticEngine';
import { parseGameUrlParams } from '../../../modules/sharing';
import { universalPartyManager } from '../../../features/party/logic/universalPartyManager';
import { storage, sessionStorageSafe, STORAGE_KEYS } from '../../../lib/storage';
import type { GarticGameState, GarticPlayer } from '../types';

const STORAGE_GARTIC_NAME = 'guessart_player_name';

interface UseGarticGameStateOptions {
  initialRoomId?: string;
}

export function useGarticGameState({ initialRoomId }: UseGarticGameStateOptions = {}) {
  const parsedUrl = useMemo(() => {
    const params = parseGameUrlParams();
    const room = params.get('room') || params.get('roomId') || initialRoomId || null;
    return { room: room ? room.toUpperCase().trim() : null };
  }, [initialRoomId]);

  const [myPlayerId] = useState<string>(() => universalPartyManager.getMyPlayerId());
  const [myPlayerName] = useState<string>(() => storage.get(STORAGE_GARTIC_NAME, 'Spieler'));

  const [gameState, setGameState] = useState<GarticGameState>(() => {
    const partyState = universalPartyManager.getRoomState();
    const effectiveRoomId = parsedUrl.room || partyState?.roomId || 'LOCAL';
    const activeGameId = partyState?.gameId;

    // 1. Check if an active game already exists for this room in sessionStorageSafe
    const savedStateKey = `${STORAGE_KEYS.GARTIC_STATE_PREFIX}${effectiveRoomId}`;
    const saved = sessionStorageSafe.getJson<GarticGameState | null>(savedStateKey, null);
    if (
      saved &&
      saved.roomId === effectiveRoomId &&
      saved.phase !== 'finished' &&
      (!activeGameId || saved.id === activeGameId)
    ) {
      return saved;
    }

    const isParty = Boolean(partyState && (!parsedUrl.room || partyState.roomId === parsedUrl.room));

    if (isParty && partyState && partyState.players.length > 0) {
      const partyPlayers: GarticPlayer[] = partyState.players.map((p) => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        ready: true,
      }));

      return createInitialGarticState(
        partyState.hostId,
        myPlayerName,
        effectiveRoomId,
        partyPlayers,
        activeGameId || undefined,
      );
    }

    const isGuestJoining = Boolean(parsedUrl.room);
    const savedHostKey = `${STORAGE_KEYS.GARTIC_HOST_PREFIX}${parsedUrl.room || 'local'}`;
    const amHost = !isGuestJoining || sessionStorageSafe.get(savedHostKey) === myPlayerId;

    if (amHost && parsedUrl.room) {
      sessionStorageSafe.set(savedHostKey, myPlayerId);
    }

    return createInitialGarticState(
      amHost ? myPlayerId : '',
      myPlayerName,
      effectiveRoomId,
    );
  });

  // Persist state changes in sessionStorageSafe to enable seamless rejoining from lobby
  useEffect(() => {
    if (gameState.roomId) {
      const stateKey = `${STORAGE_KEYS.GARTIC_STATE_PREFIX}${gameState.roomId}`;
      sessionStorageSafe.setJson(stateKey, gameState);
    }
  }, [gameState]);

  const isHost =
    gameState.hostId === myPlayerId ||
    gameState.players[0]?.id === myPlayerId ||
    universalPartyManager.isHost(gameState.roomId);

  // Robust resolution of my player
  const myPlayer =
    gameState.players.find((p) => p.id === myPlayerId) ||
    gameState.players.find((p) => p.name.toLowerCase() === myPlayerName.toLowerCase()) ||
    gameState.players[0];

  const { taskType, previousStep, hasSubmitted } = getPlayerTaskForRound(
    gameState,
    myPlayer?.id || '',
  );

  const applyRemoteState = useCallback((remoteState: GarticGameState) => {
    setGameState(remoteState);
    sessionStorageSafe.setJson(`${STORAGE_KEYS.GARTIC_STATE_PREFIX}${remoteState.roomId}`, remoteState);
  }, []);

  const applyRemoteStep = useCallback((playerId: string, content: string) => {
    setGameState((prev) => submitPlayerGarticStep(prev, playerId, content));
  }, []);

  const applyPlayerJoin = useCallback(
    (newPlayer: GarticPlayer): GarticGameState | null => {
      let updated: GarticGameState | null = null;
      setGameState((prev) => {
        if (prev.players.some((p) => p.id === newPlayer.id)) return prev;
        updated = addPlayerToGarticGame(prev, newPlayer);
        return updated;
      });
      return updated;
    },
    []
  );

  const submitStep = useCallback(
    (content: string): { updatedState: GarticGameState; isRoundCompleted: boolean } | null => {
      if (!myPlayer) return null;
      const updated = submitPlayerGarticStep(gameState, myPlayer.id, content);
      setGameState(updated);
      const isRoundCompleted =
        updated.roundIndex !== gameState.roundIndex || updated.phase !== gameState.phase;
      return { updatedState: updated, isRoundCompleted };
    },
    [gameState, myPlayer]
  );

  const restartGame = useCallback((): GarticGameState => {
    const restarted = startGarticGame({
      ...gameState,
      phase: 'prompt',
      roundIndex: 0,
      books: [],
    });
    sessionStorageSafe.setJson(`${STORAGE_KEYS.GARTIC_STATE_PREFIX}${gameState.roomId}`, restarted);
    setGameState(restarted);
    return restarted;
  }, [gameState]);

  const updateRevealState = useCallback(
    (bookIndex: number, stepIndex: number): GarticGameState => {
      const updated: GarticGameState = {
        ...gameState,
        currentRevealBookIndex: bookIndex,
        currentRevealStepIndex: stepIndex,
      };
      setGameState(updated);
      return updated;
    },
    [gameState]
  );

  const endGame = useCallback(() => {
    sessionStorageSafe.remove(`${STORAGE_KEYS.GARTIC_STATE_PREFIX}${gameState.roomId}`);
    universalPartyManager.returnToLobby(gameState.roomId);
  }, [gameState.roomId]);

  return {
    gameState,
    setGameState,
    myPlayerId,
    myPlayerName,
    myPlayer,
    isHost,
    taskType,
    previousStep,
    hasSubmitted,
    applyRemoteState,
    applyRemoteStep,
    applyPlayerJoin,
    submitStep,
    restartGame,
    updateRevealState,
    endGame,
  };
}
