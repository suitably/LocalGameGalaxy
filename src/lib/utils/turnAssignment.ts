import { storage } from '../storage';

/** The player fields that decide whether two snapshots differ. */
export interface ComparablePlayer {
  id: string;
  name?: string;
  ntfyTopic?: string;
  relayUrl?: string;
  notificationMethod?: string;
}

export interface ComparableGame<TPlayer extends ComparablePlayer = ComparablePlayer> {
  name?: string;
  players?: TPlayer[];
  updatedAt?: string | number | Date;
}

export const createPlayerAssignment = (storagePrefix: string) => {
  return {
    getLocalPlayerIds(gameId: string): string[] {
      const list = storage.getJson<string[]>(`${storagePrefix}${gameId}`, []);
      return Array.isArray(list) ? list : [];
    },

    setLocalPlayerIds(gameId: string, playerIds: string[]): void {
      storage.setJson(`${storagePrefix}${gameId}`, playerIds);
    },

    addLocalPlayerId(gameId: string, playerId: string): void {
      const current = this.getLocalPlayerIds(gameId);
      if (!current.includes(playerId)) {
        this.setLocalPlayerIds(gameId, [...current, playerId]);
      }
    },

    removeLocalPlayerId(gameId: string, playerId: string): void {
      const current = this.getLocalPlayerIds(gameId);
      this.setLocalPlayerIds(
        gameId,
        current.filter((id) => id !== playerId),
      );
    },

    isPlayerLocal(gameId: string, playerId: string, fallbackAllLocal = false): boolean {
      const localIds = this.getLocalPlayerIds(gameId);
      if (localIds.length === 0) {
        return fallbackAllLocal;
      }
      return localIds.includes(playerId);
    },
  };
};

/**
 * `comparePlayers: false` for games with player seats: seats and channels are merged on their
 * own (`mergeSeatsInto`), so differing channels must not make a whole snapshot count as newer.
 */
export const isGameBaseSnapshotNewer = <TPlayer extends ComparablePlayer>(
  snapshotGame: ComparableGame<TPlayer>,
  existingGame: ComparableGame<TPlayer>,
  options: { comparePlayers?: boolean } = {},
): boolean | null => {
  if (snapshotGame.name !== existingGame.name) return true;
  if (
    options.comparePlayers !== false &&
    snapshotGame.players &&
    existingGame.players &&
    JSON.stringify(
      snapshotGame.players.map((p) => ({
        id: p.id,
        name: p.name,
        ntfyTopic: p.ntfyTopic,
        relayUrl: p.relayUrl,
        notificationMethod: p.notificationMethod,
      })),
    ) !==
      JSON.stringify(
        existingGame.players.map((p) => ({
          id: p.id,
          name: p.name,
          ntfyTopic: p.ntfyTopic,
          relayUrl: p.relayUrl,
          notificationMethod: p.notificationMethod,
        })),
      )
  ) {
    return true;
  }

  const snapTime = new Date(snapshotGame.updatedAt || 0).getTime();
  const existTime = new Date(existingGame.updatedAt || 0).getTime();
  if (snapTime > existTime) return true;
  return null;
};
