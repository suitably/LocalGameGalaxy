import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  createInitialGarticState,
  getPlayerTaskForRound,
  startGarticGame,
  submitPlayerGarticStep,
  addPlayerToGarticGame,
} from './garticEngine';
import { GarticPromptStep } from './components/GarticPromptStep';
import { GarticDrawingStep } from './components/GarticDrawingStep';
import { GarticGuessingStep } from './components/GarticGuessingStep';
import { GarticAlbumReveal } from './components/GarticAlbumReveal';
import { GarticWaitingStatus } from './components/GarticWaitingStatus';
import { GarticHeader } from './components/GarticHeader';
import { useMultiChannelSync } from '../../modules/sync';
import { universalPartyManager } from '../../features/party/logic/universalPartyManager';
import { storage } from '../../lib/storage';
import type { GarticGameState, GarticPlayer } from './types';

const STORAGE_GARTIC_NAME = 'guessart_player_name';

interface GarticPhoneGameProps {
  onBackToMenu?: () => void;
  initialRoomId?: string;
}

export const GarticPhoneGame: React.FC<GarticPhoneGameProps> = ({
  onBackToMenu,
  initialRoomId,
}) => {
  const navigate = useNavigate();
  const handleBack = onBackToMenu || (() => navigate('/party'));

  const parsedUrl = useMemo(() => {
    const hash = window.location.hash;
    const queryString = window.location.search || (hash.includes('?') ? hash.substring(hash.indexOf('?')) : '');
    const params = new URLSearchParams(queryString);
    const room = params.get('room') || params.get('roomId') || initialRoomId || null;
    return { room: room ? room.toUpperCase().trim() : null };
  }, [initialRoomId]);

  const [myPlayerId] = useState<string>(() => universalPartyManager.getMyPlayerId());
  const [myPlayerName] = useState<string>(() => storage.get(STORAGE_GARTIC_NAME, 'Spieler'));

  const [gameState, setGameState] = useState<GarticGameState>(() => {
    const partyState = universalPartyManager.getRoomState();
    const effectiveRoomId = parsedUrl.room || partyState?.roomId || 'LOCAL';
    const activeGameId = partyState?.gameId;

    // 1. Check if an active game already exists for this room in sessionStorage
    const savedStateRaw = sessionStorage.getItem(`galaxy_gartic_state_${effectiveRoomId}`);
    if (savedStateRaw) {
      try {
        const saved = JSON.parse(savedStateRaw) as GarticGameState;
        if (
          saved &&
          saved.roomId === effectiveRoomId &&
          saved.phase !== 'finished' &&
          (!activeGameId || saved.id === activeGameId)
        ) {
          return saved;
        }
      } catch {
        // ignore
      }
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
    const savedHostKey = `gartic_host_${parsedUrl.room || 'local'}`;
    const amHost = !isGuestJoining || sessionStorage.getItem(savedHostKey) === myPlayerId;

    if (amHost && parsedUrl.room) {
      sessionStorage.setItem(savedHostKey, myPlayerId);
    }

    return createInitialGarticState(
      amHost ? myPlayerId : '',
      myPlayerName,
      effectiveRoomId,
    );
  });

  // Persist state changes in sessionStorage to enable seamless rejoining from lobby
  useEffect(() => {
    if (gameState.roomId) {
      sessionStorage.setItem(`galaxy_gartic_state_${gameState.roomId}`, JSON.stringify(gameState));
    }
  }, [gameState]);

  const isHost = gameState.hostId === myPlayerId || gameState.players[0]?.id === myPlayerId || universalPartyManager.isHost(gameState.roomId);

  type GarticBroadcastMessage =
    | { type: 'STATE_SYNC'; state: GarticGameState }
    | { type: 'GARTIC_STEP_SUBMIT'; roomId: string; playerId: string; content: string }
    | { type: 'GARTIC_JOIN'; player: GarticPlayer }
    | { type: 'GARTIC_FORCE_END' };

  // Realtime BroadcastChannel sync
  const { publish } = useMultiChannelSync<GarticBroadcastMessage>({
    channelId: gameState.roomId,
    broadcastPrefix: 'gartic_phone',
    onMessage: (msg) => {
      if (msg.type === 'STATE_SYNC' && msg.state) {
        setGameState(msg.state);
        sessionStorage.setItem(`galaxy_gartic_state_${msg.state.roomId}`, JSON.stringify(msg.state));
      } else if (msg.type === 'GARTIC_STEP_SUBMIT' && msg.playerId && msg.content !== undefined) {
        setGameState((prev) => submitPlayerGarticStep(prev, msg.playerId, msg.content));
      } else if (msg.type === 'GARTIC_FORCE_END') {
        sessionStorage.removeItem(`galaxy_gartic_state_${gameState.roomId}`);
        handleBack();
      } else if (msg.type === 'GARTIC_JOIN' && msg.player) {
        const newP = msg.player;
        setGameState((prev) => {
          if (prev.players.some((p) => p.id === newP.id)) return prev;
          const updated = addPlayerToGarticGame(prev, newP);
          if (prev.hostId === myPlayerId) {
            broadcastState(updated);
          }
          return updated;
        });
      }
    },
  });

  // Broadcast state & events over BroadcastChannel
  const broadcastState = useCallback((newState: GarticGameState) => {
    setGameState(newState);
    publish({ type: 'STATE_SYNC', state: newState });
  }, [publish]);

  const sendJoinAnnouncement = useCallback((roomId: string, player: GarticPlayer) => {
    publish({ type: 'GARTIC_JOIN', player }, roomId);
  }, [publish]);

  useEffect(() => {
    if (!gameState.roomId) return;

    // Send join ping & initial sync
    sendJoinAnnouncement(gameState.roomId, {
      id: myPlayerId,
      name: myPlayerName,
      isHost,
      ready: true,
    });

    if (isHost) {
      broadcastState(gameState);
    }
  }, [gameState.roomId, myPlayerId, myPlayerName, isHost, broadcastState, sendJoinAnnouncement]);

  const handleRevealStateChange = (bookIndex: number, stepIndex: number) => {
    broadcastState({
      ...gameState,
      currentRevealBookIndex: bookIndex,
      currentRevealStepIndex: stepIndex,
    });
  };

  const handleRestart = () => {
    const restarted = startGarticGame({
      ...gameState,
      phase: 'prompt',
      roundIndex: 0,
      books: [],
    });
    sessionStorage.setItem(`galaxy_gartic_state_${gameState.roomId}`, JSON.stringify(restarted));
    broadcastState(restarted);
  };

  const handleEndGame = () => {
    sessionStorage.removeItem(`galaxy_gartic_state_${gameState.roomId}`);
    universalPartyManager.returnToLobby(gameState.roomId);
    publish({ type: 'GARTIC_FORCE_END' });
    handleBack();
  };

  // Robust resolution of my player
  const myPlayer = gameState.players.find((p) => p.id === myPlayerId)
    || gameState.players.find((p) => p.name.toLowerCase() === myPlayerName.toLowerCase())
    || gameState.players[0];

  const { taskType, previousStep, hasSubmitted } = getPlayerTaskForRound(
    gameState,
    myPlayer?.id || '',
  );

  const handleStepSubmit = (content: string) => {
    if (!myPlayer) return;
    const updated = submitPlayerGarticStep(gameState, myPlayer.id, content);
    setGameState(updated);

    const stepPayload: GarticBroadcastMessage = {
      type: 'GARTIC_STEP_SUBMIT',
      roomId: gameState.roomId,
      playerId: myPlayer.id,
      content,
    };

    publish(stepPayload);

    // If this step completed the round and advanced to next round, broadcast full sync
    if (updated.roundIndex !== gameState.roundIndex || updated.phase !== gameState.phase) {
      broadcastState(updated);
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        overflow: 'hidden',
        flex: 1,
        minHeight: 0,
      }}
    >
      <GarticHeader
        onBack={handleBack}
        roomId={gameState.roomId}
        playerName={myPlayer?.name || myPlayerName}
        phase={gameState.phase}
        roundIndex={gameState.roundIndex}
        totalRounds={gameState.totalRounds}
        revealBookIndex={gameState.currentRevealBookIndex}
        totalBooks={gameState.books.length}
        isHost={isHost}
        onEndGame={handleEndGame}
      />

      {/* Main Game Screen */}
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          p: { xs: 0.5, sm: 1 },
          overflow: taskType === 'drawing' || taskType === 'guessing' ? 'hidden' : 'auto',
        }}
      >
        {hasSubmitted && gameState.phase !== 'reveal' && gameState.phase !== 'finished' ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 1, sm: 3 } }}>
            <GarticWaitingStatus
              state={gameState}
              myPlayerId={myPlayer?.id || myPlayerId}
            />
          </Box>
        ) : (
          <>
            {taskType === 'prompt' && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 1, sm: 3 } }}>
                <GarticPromptStep
                  playerName={myPlayer?.name || myPlayerName}
                  onSubmitPrompt={handleStepSubmit}
                />
              </Box>
            )}

            {taskType === 'drawing' && previousStep && (
              <GarticDrawingStep
                promptText={previousStep.content}
                authorName={previousStep.authorName}
                onSubmitDrawing={handleStepSubmit}
              />
            )}

            {taskType === 'guessing' && previousStep && (
              <GarticGuessingStep
                canvasData={previousStep.content}
                authorName={previousStep.authorName}
                onSubmitGuess={handleStepSubmit}
              />
            )}

            {(gameState.phase === 'reveal' || gameState.phase === 'finished') && (
              <GarticAlbumReveal
                state={gameState}
                isHost={isHost}
                onRevealStateChange={handleRevealStateChange}
                onRestartGame={handleRestart}
                onBackToMenu={handleBack}
              />
            )}
          </>
        )}
      </Box>
    </Box>
  );
};
