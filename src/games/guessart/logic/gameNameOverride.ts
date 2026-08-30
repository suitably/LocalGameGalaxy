import { storage } from '../../../lib/storage';

const STORAGE_PREFIX = 'guessart_game_alias_';

export const gameNameOverride = {
  getAlias(gameId: string): string | null {
    if (!gameId) return null;
    const val = storage.get(`${STORAGE_PREFIX}${gameId}`);
    return val && val.trim() ? val.trim() : null;
  },

  setAlias(gameId: string, alias: string): void {
    if (!gameId) return;
    const trimmed = alias.trim();
    if (!trimmed) {
      this.removeAlias(gameId);
    } else {
      storage.set(`${STORAGE_PREFIX}${gameId}`, trimmed);
    }
  },

  removeAlias(gameId: string): void {
    if (!gameId) return;
    storage.remove(`${STORAGE_PREFIX}${gameId}`);
  },

  getEffectiveGameName(gameId?: string | null, globalName?: string): string | undefined {
    if (!gameId) return globalName;
    const alias = this.getAlias(gameId);
    if (alias) return alias;
    return globalName;
  },
};
