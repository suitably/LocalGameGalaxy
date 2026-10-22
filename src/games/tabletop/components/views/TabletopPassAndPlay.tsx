/**
 * Pass and play on one device for tabletop games with seats [ID: GAME-TABLETOP-PASS-AND-PLAY]
 *
 * "Switch player" covers the table for the next seat; the hand dock and seat-only zones show
 * the new seat only after that player reveals.
 */
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  HandoverCover,
  SwitchPlayerButton,
  usePassAndPlay,
  type HandoverPlayer,
} from '../../../../modules/pass-and-play';
import type { TabletopAction, TabletopGameState } from '../../logic/tabletopReducer';
import { getSeatWidgets, resolveSeatColor, seatsForHands } from '../../logic/seatLogic';

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

  const players: HandoverPlayer[] = useMemo(
    () =>
      getSeatWidgets(state.game.widgets).map((seat) => ({
        id: seat.id,
        name: seat.player || seat.label || `P${seat.index || 1}`,
        color: resolveSeatColor(seat),
      })),
    [state.game.widgets],
  );
  const currentId = state.currentSeatId ?? players[0]?.id ?? null;
  const onActivate = useCallback(
    (seatId: string) => dispatch({ type: 'SELECT_SEAT', payload: { seatId } }),
    [dispatch],
  );
  const { coveredFor, startSwitch, retarget, reveal, cancel } = usePassAndPlay(
    players,
    currentId,
    onActivate,
  );

  if (players.length < 2) return null;
  const current = players.find((p) => p.id === currentId);

  return (
    <>
      <SwitchPlayerButton
        onClick={startSwitch}
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
