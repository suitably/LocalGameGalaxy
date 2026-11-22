import type { LobbyPlayerItem, RosterMigrationSource } from './types';
import { normalizePlayerItem } from './playerLogic';

const toList = (raw: unknown): unknown[] | null =>
  Array.isArray(raw) && raw.length > 0 ? raw : null;

const isPlayerLike = (p: unknown): p is string | LobbyPlayerItem =>
  typeof p === 'string' ||
  (typeof p === 'object' && p !== null && typeof (p as LobbyPlayerItem).name === 'string');

const normalizeList = (raw: unknown[], remoteAfterFirst: boolean): LobbyPlayerItem[] =>
  raw
    .filter(isPlayerLike)
    .map((p, idx) => normalizePlayerItem(p, remoteAfterFirst && idx > 0))
    .filter((p) => p.name.length > 0);

/**
 * The shared local roster: the one storage key first, then the caller's old per-game keys
 * (migration, read only — they are never written or deleted), then the defaults.
 */
export const readLobbyRoster = (
  read: (key: string) => unknown,
  sharedKey: string,
  migrateFrom: readonly RosterMigrationSource[],
  defaults: readonly (string | LobbyPlayerItem)[],
): LobbyPlayerItem[] => {
  const shared = read(sharedKey);
  if (Array.isArray(shared)) {
    // Once the shared key exists, the old keys are never read again (even when it is empty).
    const players = normalizeList(shared, false);
    return players.length > 0 ? players : defaults.map((p) => normalizePlayerItem(p));
  }
  for (const source of migrateFrom) {
    const { key, remoteAfterFirst = false } = typeof source === 'string' ? { key: source } : source;
    const legacy = toList(read(key));
    if (!legacy) continue;
    const players = normalizeList(legacy, remoteAfterFirst);
    if (players.length > 0) return players;
  }
  return defaults.map((p) => normalizePlayerItem(p));
};
