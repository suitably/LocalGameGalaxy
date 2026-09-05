import { storage } from '../../../lib/storage';
import { pushClient } from '../../../lib/push/pushClient';

const STORAGE_PREFIX = 'guessart_local_players_';
const TEMP_STORAGE_PREFIX = 'guessart_temp_local_players_';

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
    if (this.isTurnClaimedTemporarily(gameId, playerId)) {
      return true;
    }
    const localIds = this.getLocalPlayerIds(gameId);
    if (localIds.length === 0) {
      return fallbackAllLocal;
    }
    return localIds.includes(playerId);
  },

  /**
   * Temporarily claims a remote player for the current turn on this device.
   */
  claimTurnTemporary(gameId: string, playerId: string): void {
    const temps = this.getTemporaryClaimedPlayerIds(gameId);
    if (!temps.includes(playerId)) {
      storage.setJson(`${TEMP_STORAGE_PREFIX}${gameId}`, [...temps, playerId]);
    }
    this.addLocalPlayerId(gameId, playerId);
  },

  getTemporaryClaimedPlayerIds(gameId: string): string[] {
    const list = storage.getJson<string[]>(`${TEMP_STORAGE_PREFIX}${gameId}`, []);
    return Array.isArray(list) ? list : [];
  },

  isTurnClaimedTemporarily(gameId: string, playerId: string): boolean {
    return this.getTemporaryClaimedPlayerIds(gameId).includes(playerId);
  },

  /**
   * Releases a temporary turn claim, returning the player to remote status.
   */
  releaseTemporaryClaims(gameId: string, playerId?: string): void {
    const temps = this.getTemporaryClaimedPlayerIds(gameId);
    if (playerId) {
      if (temps.includes(playerId)) {
        this.removeLocalPlayerId(gameId, playerId);
        storage.setJson(`${TEMP_STORAGE_PREFIX}${gameId}`, temps.filter((id) => id !== playerId));
        pushClient.unsubscribeFromGamePush(gameId, playerId).catch(() => {});
      }
    } else {
      for (const id of temps) {
        this.removeLocalPlayerId(gameId, id);
        pushClient.unsubscribeFromGamePush(gameId, id).catch(() => {});
      }
      storage.remove(`${TEMP_STORAGE_PREFIX}${gameId}`);
    }
  },
};
