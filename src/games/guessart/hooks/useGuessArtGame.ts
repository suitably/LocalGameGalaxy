import { useCallback, useEffect, useState } from 'react';
import { LocalGameEngine } from '../logic/engine';
import { mailboxService } from '../logic/mailboxService';
import { gameRelayStorage } from '../../../lib/push/gameRelayStorage';
import { pushClient } from '../../../lib/push/pushClient';
import { storage } from '../../../lib/storage';
import { playerAssignment } from '../logic/playerAssignment';
import type {
  GuessArtGameRecord,
  GuessArtRound,
  HintResult,
  SelectWordPayload,
} from '../logic/types';

export interface UseGuessArtGameResult {
  game: GuessArtGameRecord | null;
  round: GuessArtRound | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  selectWord: (payload: SelectWordPayload) => Promise<void>;
  submitDrawing: (canvasData: string) => Promise<void>;
  submitGuess: (guess: string) => Promise<{ correct: boolean }>;
  requestHint: () => Promise<{ hint?: HintResult; exhausted?: boolean }>;
  updateGameDetails: (payload: {
    name?: string;
    players?: { id: string; name: string }[];
  }) => Promise<void>;
}

export const useGuessArtGame = (
  gameId: string | null,
  language: string,
): UseGuessArtGameResult => {
  const [game, setGame] = useState<GuessArtGameRecord | null>(null);
  const [round, setRound] = useState<GuessArtRound | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(gameId));
  const [error, setError] = useState<Error | null>(null);

  // 1. Game-Scoped Relay Parsing (Session only, without polluting global storage)
  useEffect(() => {
    if (!gameId || typeof window === 'undefined') return;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
      const hashParams = new URLSearchParams(hashQuery);
      const relay = hashParams.get('gameRelay') || hashParams.get('relay') || searchParams.get('gameRelay') || searchParams.get('relay');
      if (relay) {
        gameRelayStorage.setGameRelay(gameId, relay);
      }
    } catch {
      // Ignore parse errors
    }
  }, [gameId]);

  const loadSnapshot = useCallback(async () => {
    if (!gameId) {
      setGame(null);
      setRound(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const snapshot = await LocalGameEngine.getGameSnapshot(gameId, language);
      setGame(snapshot.game);
      setRound(snapshot.round);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load game'));
    } finally {
      setLoading(false);
    }
  }, [gameId, language]);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  // 2. Auto-Register Web Push for active local players in this game
  const localPlayerIdsKey = game
    ? game.players
        .filter((p) => playerAssignment.isPlayerLocal(game.id, p.id, false))
        .map((p) => p.id)
        .join(',')
    : '';

  useEffect(() => {
    if (!localPlayerIdsKey || !gameId) return;
    const ids = localPlayerIdsKey.split(',').filter(Boolean);
    const ownRelay = storage.getPushRelayUrl();
    for (const id of ids) {
      pushClient.registerForGamePush(gameId, id, ownRelay || undefined);
    }
  }, [localPlayerIdsKey, gameId]);

  // Subscribe to ephemeral mailbox and track active screen game
  useEffect(() => {
    if (!gameId) {
      mailboxService.setActiveScreenGameId(null);
      return;
    }

    mailboxService.syncSubscribedGames([gameId]);
    mailboxService.setActiveScreenGameId(gameId);

    const unsubListener = mailboxService.onRemoteSnapshot(async (remoteSnapshot, snapshotGameId) => {
      if (snapshotGameId === gameId) {
        setGame(remoteSnapshot.game);
        setRound(remoteSnapshot.round);
      }
    });

    // Re-sync from local database when user returns to the tab/app
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadSnapshot();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      unsubListener();
      mailboxService.setActiveScreenGameId(null);
    };
  }, [gameId, language, loadSnapshot]);

  const broadcastTurn = useCallback(async (actionType?: 'draw' | 'guess', actorName?: string) => {
    if (!gameId) return;
    try {
      const snap = await LocalGameEngine.getGameSnapshot(gameId, language);
      await mailboxService.publishTurn(gameId, snap);

      // Trigger Web Push to wake up closed background devices
      const gameName = snap.game?.name || 'GuessArt';
      const isDrawing = snap.game?.status === 'drawing' || snap.round?.status === 'drawing';
      const isGuessing = snap.game?.status === 'guessing' || snap.round?.status === 'guessing';
      const title = isDrawing ? `${gameName}: Du bist am Zeichnen!` : `${gameName}: Du bist am Raten!`;
      const body = actorName
        ? `${actorName} hat den Zug beendet. Du bist jetzt dran!`
        : 'Ein neuer Zug wartet auf dich!';

      const localPlayerIds = playerAssignment.getLocalPlayerIds(gameId);
      const targetPlayer = isDrawing
        ? snap.game?.players.find((p) => p.id === snap.round?.drawnById)
        : isGuessing
        ? snap.game?.players.find((p) => p.id === snap.round?.guesserId)
        : undefined;

      const effectiveRelay = gameRelayStorage.getEffectiveRelay(gameId, targetPlayer?.relayUrl);

      await pushClient.sendGamePushNotification({
        gameId,
        senderPlayerId: localPlayerIds[0],
        targetPlayerId: targetPlayer?.id,
        targetRelayUrl: effectiveRelay || undefined,
        ntfyTopic: targetPlayer?.ntfyTopic,
        title,
        body,
        url: `${window.location.origin}${window.location.pathname}#/games/guessart?gameId=${gameId}`,
        action: actionType || (isDrawing ? 'draw' : isGuessing ? 'guess' : 'turn'),
      });
    } catch (e) {
      console.warn('[useGuessArtGame] Failed to broadcast turn:', e);
    }
  }, [gameId, language]);

  const selectWord = useCallback(
    async (payload: SelectWordPayload) => {
      if (!gameId) return;
      setLoading(true);
      setError(null);
      try {
        const result = await LocalGameEngine.selectWord(gameId, payload, language);
        setGame(result.game);
        setRound(result.round);
        await broadcastTurn();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to select word'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [gameId, language, broadcastTurn],
  );

  const submitDrawing = useCallback(
    async (canvasData: string) => {
      if (!gameId) return;
      setLoading(true);
      setError(null);
      try {
        const result = await LocalGameEngine.submitDrawing(gameId, canvasData, language);
        setGame(result.game);
        setRound(result.round);
        await broadcastTurn();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to submit drawing'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [gameId, language, broadcastTurn],
  );

  const submitGuess = useCallback(
    async (guess: string) => {
      if (!gameId) return { correct: false };
      setLoading(true);
      setError(null);
      try {
        const result = await LocalGameEngine.submitGuess(gameId, guess, language);
        setGame(result.game);
        setRound(result.round);
        setLoading(false);
        await broadcastTurn();
        return { correct: result.correct };
      } catch (err) {
        setLoading(false);
        setError(err instanceof Error ? err : new Error('Failed to submit guess'));
        throw err;
      }
    },
    [gameId, language, broadcastTurn],
  );

  const requestHint = useCallback(async () => {
    if (!gameId) return { exhausted: true };
    try {
      const result = await LocalGameEngine.requestHint(gameId, language);
      setGame(result.game);
      setRound(result.round);
      await broadcastTurn();
      return { hint: result.hint, exhausted: result.exhausted };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to request hint'));
      throw err;
    }
  }, [gameId, language, broadcastTurn]);

  const updateGameDetails = useCallback(
    async (payload: { name?: string; players?: { id: string; name: string }[] }) => {
      if (!gameId) return;
      setLoading(true);
      setError(null);
      try {
        const result = await LocalGameEngine.updateGameDetails(gameId, payload, language);
        setGame(result.game);
        setRound(result.round);
        setLoading(false);
        await broadcastTurn();
      } catch (err) {
        setLoading(false);
        setError(err instanceof Error ? err : new Error('Failed to update game details'));
        throw err;
      }
    },
    [gameId, language, broadcastTurn],
  );

  return {
    game,
    round,
    loading,
    error,
    refresh: loadSnapshot,
    selectWord,
    submitDrawing,
    submitGuess,
    requestHint,
    updateGameDetails,
  };
};
