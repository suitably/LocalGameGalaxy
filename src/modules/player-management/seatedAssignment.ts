/**
 * "Is this player played here?" for a game record with player seats [ID: MOD-PLAYER-SEATED-ASSIGNMENT]
 *
 * Wraps the per-device lists of `createPlayerAssignment` (still read for records from before
 * seats existed) with the seat of each player. `claimed`: extra players this device plays for
 * now (GuessArt's "play here" for one turn).
 */
import { createPlayerAssignment } from '../../lib/utils/turnAssignment';
import { isLocalPlayer } from './seatActions';
import type { SeatedPlayer } from './playerSeats';

export interface SeatedGame {
  id: string;
  players: SeatedPlayer[];
}

export function createSeatedAssignment(
  storagePrefix: string,
  options: { claimed?: (gameId: string, playerId: string) => boolean } = {},
) {
  const base = createPlayerAssignment(storagePrefix);
  // Old records without any remote player were played on one device.
  const legacyIsLocal = (game: SeatedGame) => {
    const allLocal = !game.players.some((p) => p.isRemote);
    return (playerId: string) => base.isPlayerLocal(game.id, playerId, allLocal);
  };

  return {
    ...base,

    isLocal(game: SeatedGame, playerId: string): boolean {
      if (options.claimed?.(game.id, playerId)) return true;
      const player = game.players.find((p) => p.id === playerId);
      return player ? isLocalPlayer(player, legacyIsLocal(game)) : false;
    },

    localPlayerIds(game: SeatedGame): string[] {
      return game.players.filter((p) => this.isLocal(game, p.id)).map((p) => p.id);
    },

    /** Players this device listed as local before seats existed (for `refreshOwnSeats`). */
    legacyLocalIds(game: SeatedGame): string[] {
      const isLocal = legacyIsLocal(game);
      return game.players.filter((p) => isLocal(p.id)).map((p) => p.id);
    },
  };
}
