import { useCallback, useEffect, useState } from 'react';
import { storage } from '../../../lib/storage';
import { LocalGameEngine } from '../logic/engine';
import { playerAssignment } from '../logic/playerAssignment';
import { mailboxService } from '../logic/mailboxService';
import type { GuessArtGameRecord } from '../logic/types';

const STORAGE_KEY_GUESSART_PLAYERS = 'guessart_lobby_players_v2';

export interface LobbyPlayerItem {
  name: string;
  isRemote?: boolean;
}

export const useGuessArtLobby = () => {
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayerItem[]>(() => {
    const raw = storage.getJson<LobbyPlayerItem[]>(STORAGE_KEY_GUESSART_PLAYERS, []);
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((p) => (typeof p === 'string' ? { name: p, isRemote: false } : p));
    }
    const legacy = storage.getJson<string[]>('guessart_lobby_players', []);
    if (Array.isArray(legacy) && legacy.length > 0) {
      return legacy.map((p, idx) => ({ name: p, isRemote: idx > 0 }));
    }
    return [
      { name: 'Player 1', isRemote: false },
      { name: 'Player 2', isRemote: true },
    ];
  });

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
      mailboxService.syncSubscribedGames(games.map((g) => g.id));
    } catch (err) {
      console.error('Failed to list GuessArt games', err);
    } finally {
      setLoadingGames(false);
    }
  }, []);

  useEffect(() => {
    loadActiveGames();
  }, [loadActiveGames]);

  // Listen for background remote snapshots to keep active games list up to date
  useEffect(() => {
    const unsub = mailboxService.onRemoteSnapshot(async () => {
      try {
        const games = await LocalGameEngine.listGames();
        setActiveGames(games);
      } catch (err) {
        console.error('Failed to refresh active games on remote snapshot', err);
      }
    });
    return () => {
      unsub();
    };
  }, []);

  const addPlayer = useCallback((name: string, isRemote = false): boolean => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    setLobbyPlayers((prev) => {
      if (prev.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      return [...prev, { name: trimmed, isRemote }];
    });
    return true;
  }, []);

  const togglePlayerRemote = useCallback((name: string) => {
    setLobbyPlayers((prev) =>
      prev.map((p) => (p.name === name ? { ...p, isRemote: !p.isRemote } : p)),
    );
  }, []);

  const removePlayer = useCallback((name: string) => {
    setLobbyPlayers((prev) => prev.filter((p) => p.name !== name));
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

      // Save local player IDs on this device: All players are local by default until a link is shared
      playerAssignment.setLocalPlayerIds(
        record.id,
        record.players.map((p) => p.id),
      );

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
    togglePlayerRemote,
    removePlayer,
    activeGames,
    loadingGames,
    createGame,
    updateGameDetails,
    deleteGame,
    loadActiveGames,
  };
};
