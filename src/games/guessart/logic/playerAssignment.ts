import { storage } from '../../../lib/storage';
import { pushClient } from '../../../lib/push/pushClient';
import { createPlayerAssignment } from '../../../lib/utils/turnAssignment';
import { isLocalPlayer, type SeatedPlayer } from '../../../modules/player-management';

const STORAGE_PREFIX = 'guessart_local_players_';
const TEMP_STORAGE_PREFIX = 'guessart_temp_local_players_';

const baseAssignment = createPlayerAssignment(STORAGE_PREFIX);

interface SeatedGame {
  id: string;
  players: SeatedPlayer[];
}

export const playerAssignment = {
  ...baseAssignment,

  /**
   * Is this player played on this device? From the player's seat in the game record; a turn
   * claimed with "play here" counts as local. Records without seats use the legacy list.
   */
  isLocal(game: SeatedGame, playerId: string): boolean {
    if (this.isTurnClaimedTemporarily(game.id, playerId)) return true;
    const player = game.players.find((p) => p.id === playerId);
    if (!player) return false;
    const allLocalFallback = !game.players.some((p) => p.isRemote);
    return isLocalPlayer(player, (id) =>
      baseAssignment.isPlayerLocal(game.id, id, allLocalFallback),
    );
  },

  localPlayerIds(game: SeatedGame): string[] {
    return game.players.filter((p) => this.isLocal(game, p.id)).map((p) => p.id);
  },

  /** Players this device listed as local before seats existed (for `refreshOwnSeats`). */
  legacyLocalIds(game: SeatedGame): string[] {
    const allLocalFallback = !game.players.some((p) => p.isRemote);
    return game.players
      .filter((p) => baseAssignment.isPlayerLocal(game.id, p.id, allLocalFallback))
      .map((p) => p.id);
  },

  isPlayerLocal(gameId: string, playerId: string, fallbackAllLocal = false): boolean {
    if (this.isTurnClaimedTemporarily(gameId, playerId)) {
      return true;
    }
    return baseAssignment.isPlayerLocal(gameId, playerId, fallbackAllLocal);
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
        storage.setJson(
          `${TEMP_STORAGE_PREFIX}${gameId}`,
          temps.filter((id) => id !== playerId),
        );
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
