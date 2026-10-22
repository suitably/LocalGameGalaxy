import { useCallback, useEffect, useState } from 'react';
import { LocalGameEngine } from '../logic/engine';
import { guessArtMailbox } from '../logic/guessArtMailbox';
import { parseGameUrlParams } from '../../../modules/sharing';
import { gameRelayStorage } from '../../../lib/push/gameRelayStorage';
import { playerAssignment } from '../logic/playerAssignment';
import { getTurnPlayers } from '../logic/turnUtils';
import { guessArtNotificationService } from '../logic/notificationService';
import { sendTurnPush } from '../logic/turnPush';
import { useGuessArtSeats } from './useGuessArtSeats';
import type {
  GameSnapshot,
  GuessArtGameRecord,
  GuessArtRound,
  HintResult,
  PlayerIdentity,
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
  /** Names of players who just joined from another device (cleared by `clearJoined`). */
  joinedNames: string[];
  clearJoined: () => void;
}

export const useGuessArtGame = (gameId: string | null, language: string): UseGuessArtGameResult => {
  const [game, setGame] = useState<GuessArtGameRecord | null>(null);
  const [round, setRound] = useState<GuessArtRound | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(gameId));
  const [error, setError] = useState<Error | null>(null);

  // 1. Game-Scoped Relay Parsing (Session only, without polluting global storage)
  useEffect(() => {
    if (!gameId || typeof window === 'undefined') return;
    try {
      const params = parseGameUrlParams();
      const relay = params.get('gameRelay') || params.get('relay');
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

  // 2. This device's seats: push registration, channels, "joined" notices
  const applySnapshot = useCallback((snap: GameSnapshot) => {
    setGame(snap.game);
    setRound(snap.round);
  }, []);
  const { joinedNames, noteJoined, clearJoined } = useGuessArtSeats(game, applySnapshot);

  // Subscribe to ephemeral mailbox and track active screen game
  useEffect(() => {
    if (!gameId) {
      guessArtNotificationService.setActiveScreenGameId(null);
      return;
    }

    guessArtNotificationService.setActiveScreenGameId(gameId);

    const unsubListener = guessArtMailbox.subscribe(
      gameId,
      async (remoteSnapshot, snapshotGameId, timestamp) => {
        if (snapshotGameId === gameId) {
          try {
            const importResult = await LocalGameEngine.importSnapshot(remoteSnapshot, language);
            if (importResult.updated) {
              const isHistorical = timestamp ? Date.now() - timestamp > 30000 : false;
              const isInitialGameStart =
                !importResult.round ||
                (importResult.round.roundNumber === 1 &&
                  (importResult.round.status === 'selecting' ||
                    (importResult.round.status === 'drawing' && !importResult.round.word)));

              if (!isHistorical) {
                await guessArtNotificationService.notifyTurnIfEligible({
                  game: importResult.game,
                  round: importResult.round,
                  isRemoteEvent: true,
                  isInitialGameStart,
                  activeGameScreenId: gameId,
                  isDocumentVisible:
                    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true,
                });
              }
            }

            noteJoined(importResult.joined);
            // Show the merged state (own seats and channels kept), not the raw incoming one.
            setGame(importResult.game);
            setRound(importResult.round);
          } catch (err) {
            console.warn('[useGuessArtGame] Error processing incoming snapshot:', err);
          }
        }
      },
    );

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
      guessArtNotificationService.setActiveScreenGameId(null);
    };
  }, [gameId, language, loadSnapshot]);

  const publishSnapshot = useCallback(
    async (snap?: GameSnapshot) => {
      if (!gameId) return;
      try {
        const snapshotToPublish = snap || (await LocalGameEngine.getGameSnapshot(gameId, language));
        await guessArtMailbox.publish(gameId, snapshotToPublish);
      } catch (e) {
        console.warn('[useGuessArtGame] Failed to publish snapshot:', e);
      }
    },
    [gameId, language],
  );

  const selectWord = useCallback(
    async (payload: SelectWordPayload) => {
      if (!gameId) return;
      setLoading(true);
      setError(null);
      try {
        const result = await LocalGameEngine.selectWord(gameId, payload, language);
        setGame(result.game);
        setRound(result.round);
        await publishSnapshot(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to select word'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [gameId, language, publishSnapshot],
  );

  const submitDrawing = useCallback(
    async (canvasData: string) => {
      if (!gameId) return;
      setLoading(true);
      setError(null);
      try {
        const result = await LocalGameEngine.submitDrawing(gameId, canvasData, language);
        if (result.round?.id) {
          guessArtNotificationService.markRoundDrawnLocally(result.round.id);
        }
        setGame(result.game);
        setRound(result.round);
        await publishSnapshot(result);

        // If this drawer was claimed temporarily for this turn, release claim and restore to remote!
        const drawerId = result.round?.drawnById || round?.drawnById;
        const wasTemporaryClaim = drawerId
          ? playerAssignment.isTurnClaimedTemporarily(gameId, drawerId) ||
            Boolean(round?.temporaryClaim)
          : Boolean(round?.temporaryClaim);

        if (drawerId && wasTemporaryClaim) {
          playerAssignment.releaseTemporaryClaims(gameId, drawerId);
        }

        let guesserId = result.round?.guesserId;
        if (!guesserId && result.game && result.round) {
          guesserId = getTurnPlayers(result.game, result.round).guesser?.id;
        }
        if (guesserId) {
          await sendTurnPush({
            snap: result,
            actorId: drawerId,
            targetPlayerId: guesserId,
            actionType: 'guess',
            temporaryClaim: wasTemporaryClaim,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to submit drawing'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [gameId, language, publishSnapshot, round?.drawnById, round?.temporaryClaim],
  );

  const submitGuess = useCallback(
    async (guess: string) => {
      if (!gameId) return { correct: false };
      setLoading(true);
      setError(null);
      try {
        const activeGuesserId =
          round?.guesserId || (game && round ? getTurnPlayers(game, round).guesser?.id : undefined);
        const isGuesserClaimedTemporarily = activeGuesserId
          ? playerAssignment.isTurnClaimedTemporarily(gameId, activeGuesserId) ||
            Boolean(round?.temporaryClaim)
          : Boolean(round?.temporaryClaim);

        const result = await LocalGameEngine.submitGuess(
          gameId,
          guess,
          language,
          isGuesserClaimedTemporarily,
        );
        setGame(result.game);
        setRound(result.round);
        setLoading(false);

        const snap: GameSnapshot = { game: result.game, round: result.round };
        await publishSnapshot(snap);

        if (result.correct) {
          // Word guessed: the next drawer is told. A "play here" claim stays active for this
          // device's whole turn (guess, then pick and draw) and is released by submitDrawing.
          const nextDrawerId = result.round?.drawnById;
          if (nextDrawerId) {
            await sendTurnPush({
              snap,
              actorId: activeGuesserId,
              targetPlayerId: nextDrawerId,
              actionType: 'draw',
              temporaryClaim: isGuesserClaimedTemporarily,
            });
          }
        }

        return { correct: result.correct };
      } catch (err) {
        setLoading(false);
        setError(err instanceof Error ? err : new Error('Failed to submit guess'));
        throw err;
      }
    },
    [gameId, language, publishSnapshot, game, round],
  );

  const requestHint = useCallback(async () => {
    if (!gameId) return { exhausted: true };
    try {
      const result = await LocalGameEngine.requestHint(gameId, language);
      setGame(result.game);
      setRound(result.round);
      await publishSnapshot({ game: result.game, round: result.round });
      return { hint: result.hint, exhausted: result.exhausted };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to request hint'));
      throw err;
    }
  }, [gameId, language, publishSnapshot]);

  const updateGameDetails = useCallback(
    async (payload: { name?: string; players?: (Partial<PlayerIdentity> & { id: string })[] }) => {
      if (!gameId) return;
      setLoading(true);
      setError(null);
      try {
        const result = await LocalGameEngine.updateGameDetails(gameId, payload, language);
        setGame(result.game);
        setRound(result.round);
        setLoading(false);
        await publishSnapshot(result);
      } catch (err) {
        setLoading(false);
        setError(err instanceof Error ? err : new Error('Failed to update game details'));
        throw err;
      }
    },
    [gameId, language, publishSnapshot],
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
    joinedNames,
    clearJoined,
  };
};
