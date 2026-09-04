import { useCallback, useEffect, useState } from 'react';
import { LocalGameEngine } from '../logic/engine';
import { playerAssignment } from '../logic/playerAssignment';
import { mailboxService } from '../logic/mailboxService';
import { useLobbyPlayers } from '../../../modules/player-management';
import type { LobbyPlayerItem } from '../../../modules/player-management';
import type { GuessArtGameRecord } from '../logic/types';

export type { LobbyPlayerItem };

const STORAGE_KEY_GUESSART_PLAYERS = 'guessart_lobby_players_v2';

export const useGuessArtLobby = () => {
  const {
    players: lobbyPlayers,
    addPlayer,
    removePlayer,
    togglePlayerRemote,
    hasMinPlayers,
  } = useLobbyPlayers({
    storageKey: STORAGE_KEY_GUESSART_PLAYERS,
    defaultPlayers: [
      { name: 'Player 1', isRemote: false },
      { name: 'Player 2', isRemote: true },
    ],
    legacyStorageKeys: ['guessart_lobby_players'],
    minPlayers: 2,
  });

  const [activeGames, setActiveGames] = useState<GuessArtGameRecord[]>([]);
  const [loadingGames, setLoadingGames] = useState<boolean>(true);

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

  const createGame = useCallback(
    async (options: {
      name?: string;
      language: string;
      manualWordMode: boolean;
    }): Promise<GuessArtGameRecord> => {
      if (!hasMinPlayers) {
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
    [hasMinPlayers, lobbyPlayers, loadActiveGames],
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
