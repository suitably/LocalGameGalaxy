/**
 * Seats in a story: this device's upkeep and whose turn is played here [ID: HOOK-STORYTELLER-SEATS]
 */
import { useCallback } from 'react';
import { inviteSeat, reclaimSeat, useSeatUpkeep } from '../../../modules/player-management';
import { LocalStoryEngine } from '../logic/engine';
import { playerAssignment } from '../logic/playerAssignment';
import type { StoryEntry, StoryGameRecord, StoryPlayer } from '../types';

export function useStorySeats(
  game: StoryGameRecord | null,
  /** Shows and publishes a saved state. */
  publishSnapshot: (game: StoryGameRecord, entries: StoryEntry[]) => void,
) {
  const gameId = game?.id;
  const persist = useCallback(
    async (players: StoryPlayer[]) => {
      if (!gameId) return;
      const snap = await LocalStoryEngine.updateGameDetails(gameId, { players });
      publishSnapshot(snap.game, snap.entries);
    },
    [gameId, publishSnapshot],
  );

  const upkeep = useSeatUpkeep({
    game,
    pushPlayerIds: game ? playerAssignment.localPlayerIds(game) : [],
    legacyLocalIds: game ? playerAssignment.legacyLocalIds(game) : [],
    persist,
  });

  const activePlayer = game?.players[game.currentPlayerIndex];
  const isCurrentTurnLocal =
    !game || !activePlayer || playerAssignment.isLocal(game, activePlayer.id);

  /** Play a remote player here again. */
  const claimPlayer = useCallback(
    (playerId: string) => {
      if (game) void persist(reclaimSeat(game.players, playerId));
    },
    [game, persist],
  );

  /** Header toggle: take the current turn here, or hand the player out again (invite). */
  const toggleCurrentTurn = useCallback(() => {
    if (!game || !activePlayer) return;
    void persist(
      isCurrentTurnLocal
        ? inviteSeat(game.players, activePlayer.id)
        : reclaimSeat(game.players, activePlayer.id),
    );
  }, [game, activePlayer, isCurrentTurnLocal, persist]);

  return { ...upkeep, isCurrentTurnLocal, claimPlayer, toggleCurrentTurn };
}
