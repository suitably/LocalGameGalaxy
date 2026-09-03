import { storage } from '../../../lib/storage';

const STORAGE_PREFIX = 'storyteller_local_players_';

export const playerAssignment = {
  getLocalPlayerIds(gameId: string): string[] {
    const list = storage.getJson<string[]>(`${STORAGE_PREFIX}${gameId}`, []);
    return Array.isArray(list) ? list : [];
  },

  setLocalPlayerIds(gameId: string, playerIds: string[]): void {
    storage.setJson(`${STORAGE_PREFIX}${gameId}`, playerIds);
  },

  addLocalPlayerId(gameId: string, playerId: string): void {
    const current = this.getLocalPlayerIds(gameId);
    if (!current.includes(playerId)) {
      this.setLocalPlayerIds(gameId, [...current, playerId]);
    }
  },

  removeLocalPlayerId(gameId: string, playerId: string): void {
    const current = this.getLocalPlayerIds(gameId);
    this.setLocalPlayerIds(gameId, current.filter((id) => id !== playerId));
  },

  isPlayerLocal(gameId: string, playerId: string, fallbackAllLocal = false): boolean {
    const localIds = this.getLocalPlayerIds(gameId);
    if (localIds.length === 0) {
      return fallbackAllLocal;
    }
    return localIds.includes(playerId);
  },
};
