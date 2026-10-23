/**
 * This device's seats in a GuessArt game (push, own channels, "joined" notice) [ID: HOOK-GUESSART-SEATS]
 */
import { useCallback } from 'react';
import { useSeatUpkeep } from '../../../modules/player-management';
import { LocalGameEngine } from '../logic/engine';
import { guessArtMailbox } from '../logic/guessArtMailbox';
import { playerAssignment } from '../logic/playerAssignment';
import type { GameSnapshot, GuessArtGameRecord, PlayerIdentity } from '../logic/types';

export function useGuessArtSeats(
  game: GuessArtGameRecord | null,
  onSeatsSaved: (snap: GameSnapshot) => void,
) {
  const gameId = game?.id;
  const persist = useCallback(
    async (players: PlayerIdentity[]) => {
      if (!gameId) return;
      const snap = await LocalGameEngine.updateGameDetails(gameId, { players });
      onSeatsSaved(snap);
      guessArtMailbox.publish(gameId, snap).catch(() => {});
    },
    [gameId, onSeatsSaved],
  );

  return useSeatUpkeep({
    game,
    // A turn borrowed with "play here" does not get push subscriptions on this device.
    pushPlayerIds: game
      ? playerAssignment
          .localPlayerIds(game)
          .filter((id) => !playerAssignment.isTurnClaimedTemporarily(game.id, id))
      : [],
    legacyLocalIds: game ? playerAssignment.legacyLocalIds(game) : [],
    persist,
  });
}
