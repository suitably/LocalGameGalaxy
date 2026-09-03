import { useCallback, useEffect, useState } from 'react';
import { storage } from '../../../lib/storage';
import { LocalStoryEngine } from '../logic/engine';
import { deleteStoryGame } from '../logic/repository';
import { DEFAULT_MODIFIER_SETTINGS } from '../logic/modifiers';
import { playerAssignment } from '../logic/playerAssignment';
import type { StoryGameRecord, StoryModifierSettings } from '../types';

const STORAGE_KEY_STORY_PLAYERS = 'storyteller_lobby_players';
const STORAGE_KEY_STORY_MODIFIERS = 'storyteller_lobby_modifiers';

export interface StoryLobbyPlayerItem {
  name: string;
}

export const useStorytellerLobby = () => {
  const [lobbyPlayers, setLobbyPlayers] = useState<StoryLobbyPlayerItem[]>(() => {
    const raw = storage.getJson<StoryLobbyPlayerItem[]>(STORAGE_KEY_STORY_PLAYERS, []);
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((p) => ({ name: typeof p === 'string' ? p : p.name }));
    }
    return [{ name: 'Spieler 1' }, { name: 'Spieler 2' }];
  });

  const [modifiers, setModifiers] = useState<StoryModifierSettings>(() => {
    const raw = storage.getJson<StoryModifierSettings>(
      STORAGE_KEY_STORY_MODIFIERS,
      DEFAULT_MODIFIER_SETTINGS,
    );
    return {
      blindMode: { ...DEFAULT_MODIFIER_SETTINGS.blindMode, ...raw?.blindMode },
      timeAttack: { ...DEFAULT_MODIFIER_SETTINGS.timeAttack, ...raw?.timeAttack },
      wordRoulette: { ...DEFAULT_MODIFIER_SETTINGS.wordRoulette, ...raw?.wordRoulette },
    };
  });

  const [activeGames, setActiveGames] = useState<StoryGameRecord[]>([]);
  const [loadingGames, setLoadingGames] = useState<boolean>(true);

  useEffect(() => {
    storage.setJson(STORAGE_KEY_STORY_PLAYERS, lobbyPlayers);
  }, [lobbyPlayers]);

  useEffect(() => {
    storage.setJson(STORAGE_KEY_STORY_MODIFIERS, modifiers);
  }, [modifiers]);

  const loadActiveGames = useCallback(async () => {
    setLoadingGames(true);
    try {
      const games = await LocalStoryEngine.listGames();
      setActiveGames(games);
    } catch (err) {
      console.error('Failed to list Storyteller games', err);
    } finally {
      setLoadingGames(false);
    }
  }, []);

  useEffect(() => {
    loadActiveGames();
  }, [loadActiveGames]);

  const addPlayer = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLobbyPlayers((prev) => [...prev, { name: trimmed }]);
  };

  const removePlayer = (index: number) => {
    setLobbyPlayers((prev) => prev.filter((_, i) => i !== index));
  };

  const updateModifier = <K extends keyof StoryModifierSettings>(
    key: K,
    patch: Partial<StoryModifierSettings[K]>,
  ) => {
    setModifiers((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...patch,
      },
    }));
  };

  const createGame = async (options: {
    name?: string;
    language: string;
    modifiers: StoryModifierSettings;
  }): Promise<StoryGameRecord> => {
    const record = await LocalStoryEngine.createGame({
      name: options.name,
      players: lobbyPlayers,
      language: options.language,
      modifiers: options.modifiers,
    });

    // In GuessArt architecture: by default on the creating device, ALL players are local (pass & play).
    // When a player link or QR code is shared during the game, that player is automatically marked as remote.
    const allPlayerIds = record.players.map((p) => p.id);
    playerAssignment.setLocalPlayerIds(record.id, allPlayerIds);

    await loadActiveGames();
    return record;
  };

  const deleteGame = async (id: string) => {
    await deleteStoryGame(id);
    await loadActiveGames();
  };

  return {
    lobbyPlayers,
    modifiers,
    activeGames,
    loadingGames,
    addPlayer,
    removePlayer,
    updateModifier,
    createGame,
    deleteGame,
    loadActiveGames,
  };
};
