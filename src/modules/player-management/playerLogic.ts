import type { LobbyPlayerItem } from './types';

export const normalizePlayerItem = (
  item: string | LobbyPlayerItem,
  defaultRemote = false,
): LobbyPlayerItem => {
  if (typeof item === 'string') {
    return { name: item.trim(), isRemote: defaultRemote };
  }
  return {
    name: (item.name || '').trim(),
    isRemote: item.isRemote ?? defaultRemote,
  };
};

export interface AddPlayerResult {
  success: boolean;
  reason?: 'empty' | 'max_reached' | 'duplicate';
  players: LobbyPlayerItem[];
}

export const addPlayerToLobby = (
  players: LobbyPlayerItem[],
  name: string,
  options?: {
    isRemote?: boolean;
    maxPlayers?: number;
  },
): AddPlayerResult => {
  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, reason: 'empty', players };
  }

  if (options?.maxPlayers !== undefined && players.length >= options.maxPlayers) {
    return { success: false, reason: 'max_reached', players };
  }

  const isDuplicate = players.some(
    (p) => p.name.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  if (isDuplicate) {
    return { success: false, reason: 'duplicate', players };
  }

  return {
    success: true,
    players: [...players, { name: trimmed, isRemote: options?.isRemote ?? false }],
  };
};

export const removePlayerFromLobby = (
  players: LobbyPlayerItem[],
  nameOrIndex: string | number,
): LobbyPlayerItem[] => {
  if (typeof nameOrIndex === 'number') {
    return players.filter((_, idx) => idx !== nameOrIndex);
  }
  const target = nameOrIndex.trim().toLowerCase();
  return players.filter((p) => p.name.trim().toLowerCase() !== target);
};

export const togglePlayerRemoteInLobby = (
  players: LobbyPlayerItem[],
  name: string,
): LobbyPlayerItem[] => {
  const target = name.trim().toLowerCase();
  return players.map((p) =>
    p.name.trim().toLowerCase() === target ? { ...p, isRemote: !p.isRemote } : p,
  );
};
