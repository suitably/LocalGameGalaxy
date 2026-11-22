import { useCallback, useEffect, useMemo, useState } from 'react';
import { storage, STORAGE_KEYS } from '../../lib/storage';
import type { LobbyPlayerItem, UseLobbyPlayersOptions, UseLobbyPlayersResult } from './types';
import { addPlayerToLobby, removePlayerFromLobby, togglePlayerRemoteInLobby } from './playerLogic';
import { readLobbyRoster } from './lobbyRoster';

const readJson = (key: string): unknown => storage.getJson<unknown>(key, null);

/**
 * The one local player list of every pass-and-play lobby on this device. All games read and
 * write `STORAGE_KEYS.LOBBY_PLAYERS`; a game's old key is only read once as migration.
 */
export const useLobbyPlayers = (options: UseLobbyPlayersOptions = {}): UseLobbyPlayersResult => {
  const {
    defaultPlayers = [{ name: 'Spieler 1' }, { name: 'Spieler 2' }],
    minPlayers = 2,
    maxPlayers,
    migrateFrom = [],
  } = options;

  const [players, setPlayers] = useState<LobbyPlayerItem[]>(() =>
    readLobbyRoster(readJson, STORAGE_KEYS.LOBBY_PLAYERS, migrateFrom, defaultPlayers),
  );

  useEffect(() => {
    storage.setJson(STORAGE_KEYS.LOBBY_PLAYERS, players);
  }, [players]);

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

  const hasValidCount =
    players.length >= minPlayers && (maxPlayers === undefined || players.length <= maxPlayers);

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
    hasValidCount,
    canAddMore,
    minPlayers,
    maxPlayers,
  };
};
