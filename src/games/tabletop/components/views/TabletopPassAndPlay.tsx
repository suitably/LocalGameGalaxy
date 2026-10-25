/**
 * Pass and play on one device for tabletop games with seats [ID: GAME-TABLETOP-PASS-AND-PLAY]
 *
 * "Switch player" covers the table for the next seat; the hand dock and seat-only zones show
 * the new seat only after that player reveals.
 */
import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material';
import {
  HandoverCover,
  nextPlayerId,
  SwitchPlayerButton,
  usePassAndPlay,
  type HandoverPlayer,
} from '../../../../modules/pass-and-play';
import type { TabletopAction, TabletopGameState } from '../../logic/tabletopReducer';
import {
  getSeatWidgets,
  resolveSeatColor,
  seatsForHands,
  SPECTATOR_SEAT_ID,
} from '../../logic/seatLogic';

export const TabletopPassAndPlay: React.FC<{
  state: TabletopGameState;
  dispatch: React.Dispatch<TabletopAction>;
}> = ({ state, dispatch }) => {
  // Games with private hands but no seats (e.g. the built-in card deck) get one seat per hand.
  const missingSeats = useMemo(() => seatsForHands(state.game.widgets), [state.game.widgets]);
  useEffect(() => {
    if (missingSeats.length > 1)
      dispatch({ type: 'ADD_WIDGETS', payload: { widgets: missingSeats } });
  }, [missingSeats, dispatch]);

  const { t } = useTranslation();
  const theme = useTheme();
  const seatPlayers: HandoverPlayer[] = useMemo(
    () =>
      getSeatWidgets(state.game.widgets).map((seat) => ({
        id: seat.id,
        name: seat.player || seat.label || `P${seat.index || 1}`,
        color: resolveSeatColor(seat),
      })),
    [state.game.widgets],
  );
  // The cover can also be pointed at a spectator: sees the table, has no hand, cannot draw.
  const players: HandoverPlayer[] = useMemo(
    () => [
      ...seatPlayers,
      {
        id: SPECTATOR_SEAT_ID,
        name: t('games.tabletop.spectator', 'Zuschauer'),
        color: theme.palette.text.secondary,
      },
    ],
    [seatPlayers, t, theme.palette.text.secondary],
  );
  const firstSeatId = seatPlayers[0]?.id;
  const currentId = state.currentSeatId ?? firstSeatId ?? null;
  // Sit player 1 down explicitly, so surface, dock and sync agree on the seat from the start.
  useEffect(() => {
    if (!state.currentSeatId && firstSeatId && seatPlayers.length > 1)
      dispatch({ type: 'SELECT_SEAT', payload: { seatId: firstSeatId } });
  }, [state.currentSeatId, firstSeatId, seatPlayers.length, dispatch]);
  const onActivate = useCallback(
    (seatId: string) => dispatch({ type: 'SELECT_SEAT', payload: { seatId } }),
    [dispatch],
  );
  const { coveredFor, startSwitch, retarget, reveal, cancel } = usePassAndPlay(
    players,
    currentId,
    onActivate,
  );
  // "Switch player" rotates through the seats only; the spectator is picked on the cover.
  const switchToNextSeat = () => {
    const next = nextPlayerId(seatPlayers, currentId);
    startSwitch();
    if (next) retarget(next);
  };

  if (seatPlayers.length < 2) return null;
  const current = players.find((p) => p.id === currentId);

  return (
    <>
      <SwitchPlayerButton
        onClick={switchToNextSeat}
        currentName={current?.name}
        sx={{ position: 'absolute', left: 12, bottom: { xs: 76, sm: 12 }, zIndex: 1100 }}
      />
      {coveredFor && (
        <HandoverCover
          player={coveredFor}
          players={players}
          onReveal={reveal}
          onRetarget={retarget}
          onCancel={cancel}
        />
      )}
    </>
  );
};
