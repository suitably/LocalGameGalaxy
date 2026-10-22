/**
 * Whose turn it is and whether that player is played on this device [ID: HOOK-GUESSART-TURN-SEAT]
 */
import { useCallback, useMemo, useState } from 'react';
import { inviteSeat } from '../../../modules/player-management';
import { LocalGameEngine } from '../logic/engine';
import { guessArtMailbox } from '../logic/guessArtMailbox';
import { playerAssignment } from '../logic/playerAssignment';
import { getTurnPlayers } from '../logic/turnUtils';
import type { GuessArtGameRecord, GuessArtRound } from '../logic/types';

export function useGuessArtTurnSeat(
  game: GuessArtGameRecord | null,
  round: GuessArtRound | null,
  refresh: () => Promise<void>,
) {
  // Temporary "play here" claims live in device storage; bump to re-read them.
  const [claimsVersion, setClaimsVersion] = useState(0);
  const triggerLocalUpdate = useCallback(() => setClaimsVersion((v) => v + 1), []);

  const { drawer, guesser } = getTurnPlayers(game, round);
  const isDrawing = round?.status === 'selecting' || round?.status === 'drawing';
  const activeTurnPlayerId = isDrawing
    ? round?.drawnById || drawer?.id || null
    : guesser?.id || null;

  const seats = useMemo(() => {
    void claimsVersion;
    const isLocal = (id?: string | null) =>
      Boolean(game && id && playerAssignment.isLocal(game, id));
    return {
      isCurrentDrawerLocal: isLocal(drawer?.id),
      isCurrentGuesserLocal: isLocal(guesser?.id),
      isHost: game?.players[0] ? isLocal(game.players[0].id) : true,
      localPlayerIds: game ? playerAssignment.localPlayerIds(game) : [],
      isTemporaryTurn:
        game && activeTurnPlayerId
          ? playerAssignment.isTurnClaimedTemporarily(game.id, activeTurnPlayerId)
          : false,
    };
  }, [game, drawer?.id, guesser?.id, activeTurnPlayerId, claimsVersion]);

  const isCurrentTurnLocal = isDrawing ? seats.isCurrentDrawerLocal : seats.isCurrentGuesserLocal;

  /** Host only: play the current turn here, or hand it back to the remote player. */
  const handleToggleLocalRemote = useCallback(async () => {
    if (!game || !activeTurnPlayerId || !seats.isHost) return;
    if (!isCurrentTurnLocal) {
      playerAssignment.claimTurnTemporary(game.id, activeTurnPlayerId);
    } else if (seats.isTemporaryTurn) {
      playerAssignment.releaseTemporaryClaims(game.id, activeTurnPlayerId);
    } else {
      // Seated here: hand the player over by inviting them (the share dialog has the link).
      const snap = await LocalGameEngine.updateGameDetails(game.id, {
        players: inviteSeat(game.players, activeTurnPlayerId),
      });
      guessArtMailbox.publish(game.id, snap).catch(() => {});
    }
    triggerLocalUpdate();
    await refresh();
  }, [game, activeTurnPlayerId, seats, isCurrentTurnLocal, triggerLocalUpdate, refresh]);

  return {
    activeDrawer: drawer,
    activeGuesser: guesser,
    activeTurnPlayerId,
    isCurrentTurnLocal,
    ...seats,
    triggerLocalUpdate,
    handleToggleLocalRemote,
  };
}
