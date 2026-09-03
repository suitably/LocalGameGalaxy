import { useCallback, useEffect, useState } from 'react';
import { LocalStoryEngine } from '../logic/engine';
import type { StoryEntry, StoryGameRecord } from '../types';

export const useStorytellerGame = (gameId: string | null) => {
  const [game, setGame] = useState<StoryGameRecord | null>(null);
  const [entries, setEntries] = useState<StoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(gameId));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!gameId) {
      setGame(null);
      setEntries([]);
      setLoading(false);
      return;
    }

    try {
      const snapshot = await LocalStoryEngine.getGameSnapshot(gameId);
      setGame(snapshot.game);
      setEntries(snapshot.entries);
      setError(null);
    } catch (err: unknown) {
      console.error('[Storyteller] Failed to load snapshot:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submitTurn = useCallback(
    async (text: string, timeSpentSeconds?: number) => {
      if (!gameId) throw new Error('No active game');
      setLoading(true);
      try {
        const snapshot = await LocalStoryEngine.submitTurn(gameId, { text, timeSpentSeconds });
        setGame(snapshot.game);
        setEntries(snapshot.entries);
        return snapshot;
      } finally {
        setLoading(false);
      }
    },
    [gameId],
  );

  const finishStory = useCallback(async () => {
    if (!gameId) throw new Error('No active game');
    setLoading(true);
    try {
      const snapshot = await LocalStoryEngine.finishStory(gameId);
      setGame(snapshot.game);
      setEntries(snapshot.entries);
      return snapshot;
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  const updateGameDetails = useCallback(
    async (payload: { name?: string; players?: { id: string; name: string }[] }) => {
      if (!gameId) throw new Error('No active game');
      const snapshot = await LocalStoryEngine.updateGameDetails(gameId, payload);
      setGame(snapshot.game);
      setEntries(snapshot.entries);
      return snapshot;
    },
    [gameId],
  );

  return {
    game,
    entries,
    loading,
    error,
    refresh,
    submitTurn,
    finishStory,
    updateGameDetails,
  };
};
