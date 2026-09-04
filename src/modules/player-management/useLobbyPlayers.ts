import { useCallback, useEffect, useMemo, useState } from 'react';
import { storage } from '../../lib/storage';
import type {
  LobbyPlayerItem,
  UseLobbyPlayersOptions,
  UseLobbyPlayersResult,
} from './types';
import {
  addPlayerToLobby,
  normalizePlayerItem,
  removePlayerFromLobby,
  togglePlayerRemoteInLobby,
} from './playerLogic';

export const useLobbyPlayers = (options: UseLobbyPlayersOptions): UseLobbyPlayersResult => {
  const {
    storageKey,
    defaultPlayers = [{ name: 'Spieler 1' }, { name: 'Spieler 2' }],
    minPlayers = 2,
    maxPlayers,
    legacyStorageKeys = [],
  } = options;

  const [players, setPlayers] = useState<LobbyPlayerItem[]>(() => {
    // 1. Primary storage check
    const raw = storage.getJson<unknown>(storageKey, null);
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((p) => normalizePlayerItem(p as string | LobbyPlayerItem));
    }

    // 2. Legacy fallback check
    for (const legacyKey of legacyStorageKeys) {
      const legacyRaw = storage.getJson<unknown>(legacyKey, null);
      if (Array.isArray(legacyRaw) && legacyRaw.length > 0) {
        return legacyRaw.map((p, idx) =>
          normalizePlayerItem(p as string | LobbyPlayerItem, idx > 0),
        );
      }
    }

    // 3. Default fallback
    return defaultPlayers.map((p) => normalizePlayerItem(p));
  });

  // Persist whenever players or storageKey changes
  useEffect(() => {
    storage.setJson(storageKey, players);
  }, [players, storageKey]);

  const addPlayer = useCallback(
    (name: string, isRemote = false): boolean => {
      const result = addPlayerToLobby(players, name, { isRemote, maxPlayers });
      if (!result.success) {
        return false;
      }
      setPlayers(result.players);
      return true;
    },
    [players, maxPlayers],
  );

  const removePlayer = useCallback((nameOrIndex: string | number) => {
    setPlayers((prev) => removePlayerFromLobby(prev, nameOrIndex));
  }, []);

  const togglePlayerRemote = useCallback((name: string) => {
    setPlayers((prev) => togglePlayerRemoteInLobby(prev, name));
  }, []);

  const hasMinPlayers = useMemo(() => players.length >= minPlayers, [players.length, minPlayers]);

  const canAddMore = useMemo(
    () => maxPlayers === undefined || players.length < maxPlayers,
    [players.length, maxPlayers],
  );

  return {
    players,
    addPlayer,
    removePlayer,
    togglePlayerRemote,
    setPlayers,
    hasMinPlayers,
    canAddMore,
    minPlayers,
    maxPlayers,
  };
};
