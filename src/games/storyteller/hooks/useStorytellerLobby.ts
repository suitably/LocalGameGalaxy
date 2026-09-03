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
  isRemote?: boolean;
}

export const useStorytellerLobby = () => {
  const [lobbyPlayers, setLobbyPlayers] = useState<StoryLobbyPlayerItem[]>(() => {
    const raw = storage.getJson<StoryLobbyPlayerItem[]>(STORAGE_KEY_STORY_PLAYERS, []);
    if (Array.isArray(raw) && raw.length > 0) {
      return raw;
    }
    return [
      { name: 'Spieler 1', isRemote: false },
      { name: 'Spieler 2', isRemote: false },
    ];
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
    setLobbyPlayers((prev) => [...prev, { name: trimmed, isRemote: false }]);
  };

  const removePlayer = (index: number) => {
    setLobbyPlayers((prev) => prev.filter((_, i) => i !== index));
  };

  const togglePlayerRemote = (index: number) => {
    setLobbyPlayers((prev) =>
      prev.map((player, i) => (i === index ? { ...player, isRemote: !player.isRemote } : player)),
    );
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

    // Mark non-remote players as local on host device
    const localIds = record.players.filter((p) => !p.isRemote).map((p) => p.id);
    playerAssignment.setLocalPlayerIds(record.id, localIds.length > 0 ? localIds : [record.players[0].id]);

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
    togglePlayerRemote,
    updateModifier,
    createGame,
    deleteGame,
    loadActiveGames,
  };
};
