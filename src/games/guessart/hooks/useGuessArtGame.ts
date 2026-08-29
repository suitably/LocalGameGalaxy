import { useCallback, useEffect, useState } from 'react';
import { LocalGameEngine } from '../logic/engine';
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

  const selectWord = useCallback(
    async (payload: SelectWordPayload) => {
      if (!gameId) return;
      setLoading(true);
      setError(null);
      try {
        const result = await LocalGameEngine.selectWord(gameId, payload, language);
        setGame(result.game);
        setRound(result.round);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to select word'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [gameId, language],
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
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to submit drawing'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [gameId, language],
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
        return { correct: result.correct };
      } catch (err) {
        setLoading(false);
        setError(err instanceof Error ? err : new Error('Failed to submit guess'));
        throw err;
      }
    },
    [gameId, language],
  );

  const requestHint = useCallback(async () => {
    if (!gameId) return { exhausted: true };
    try {
      const result = await LocalGameEngine.requestHint(gameId, language);
      setGame(result.game);
      setRound(result.round);
      return { hint: result.hint, exhausted: result.exhausted };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to request hint'));
      throw err;
    }
  }, [gameId, language]);

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
      } catch (err) {
        setLoading(false);
        setError(err instanceof Error ? err : new Error('Failed to update game details'));
        throw err;
      }
    },
    [gameId, language],
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
