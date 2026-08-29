import { useCallback, useEffect, useState } from 'react';
import { storage } from '../../../lib/storage';
import { LocalGameEngine } from '../logic/engine';
import type { GuessArtGameRecord } from '../logic/types';

const STORAGE_KEY_GUESSART_PLAYERS = 'guessart_lobby_players';

export const useGuessArtLobby = () => {
  const [lobbyPlayers, setLobbyPlayers] = useState<string[]>(() =>
    storage.getJson<string[]>(STORAGE_KEY_GUESSART_PLAYERS, ['Player 1', 'Player 2']),
  );
  const [activeGames, setActiveGames] = useState<GuessArtGameRecord[]>([]);
  const [loadingGames, setLoadingGames] = useState<boolean>(true);

  useEffect(() => {
    storage.setJson(STORAGE_KEY_GUESSART_PLAYERS, lobbyPlayers);
  }, [lobbyPlayers]);

  const loadActiveGames = useCallback(async () => {
    setLoadingGames(true);
    try {
      const games = await LocalGameEngine.listGames();
      setActiveGames(games);
    } catch (err) {
      console.error('Failed to list GuessArt games', err);
    } finally {
      setLoadingGames(false);
    }
  }, []);

  useEffect(() => {
    loadActiveGames();
  }, [loadActiveGames]);

  const addPlayer = useCallback((name: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    setLobbyPlayers((prev) => {
      if (prev.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      return [...prev, trimmed];
    });
    return true;
  }, []);

  const removePlayer = useCallback((name: string) => {
    setLobbyPlayers((prev) => prev.filter((p) => p !== name));
  }, []);

  const createGame = useCallback(
    async (options: {
      name?: string;
      language: string;
      manualWordMode: boolean;
    }): Promise<GuessArtGameRecord> => {
      if (lobbyPlayers.length < 2) {
        throw new Error('At least 2 players required');
      }
      const record = await LocalGameEngine.createGame({
        name: options.name,
        players: lobbyPlayers,
        language: options.language,
        manualWordMode: options.manualWordMode,
      });
      await loadActiveGames();
      return record;
    },
    [lobbyPlayers, loadActiveGames],
  );

  const updateGameDetails = useCallback(
    async (
      gameId: string,
      payload: { name?: string; players?: { id: string; name: string }[] },
      language?: string,
    ) => {
      await LocalGameEngine.updateGameDetails(gameId, payload, language);
      await loadActiveGames();
    },
    [loadActiveGames],
  );

  const deleteGame = useCallback(
    async (gameId: string) => {
      await LocalGameEngine.deleteGame(gameId);
      await loadActiveGames();
    },
    [loadActiveGames],
  );

  return {
    lobbyPlayers,
    addPlayer,
    removePlayer,
    activeGames,
    loadingGames,
    createGame,
    updateGameDetails,
    deleteGame,
    refreshActiveGames: loadActiveGames,
  };
};
