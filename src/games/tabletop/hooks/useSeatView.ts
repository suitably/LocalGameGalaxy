/**
 * Viewer seat, spectator flag and hand for surface and dock [ID: HOOK-TABLETOP-SEAT-VIEW]
 */
import { useMemo } from 'react';
import type { Dispatch } from 'react';
import type { TabletopGameState, TabletopAction } from '../logic/tabletopReducer';
import { resolveSeatView } from '../logic/seatLogic';

const NO_DISPATCH: Dispatch<TabletopAction> = () => {};

/**
 * `access.readOnly` marks a spectator device (`role=spectator`); the returned `dispatch` is then
 * a no-op, so no widget interaction can change the table.
 */
export function useSeatView(
  state: TabletopGameState,
  access?: { readOnly?: boolean; dispatch: Dispatch<TabletopAction> },
) {
  const { widgets } = state.game;
  const view = useMemo(
    () => resolveSeatView(widgets, state.currentSeatId),
    [widgets, state.currentSeatId],
  );
  const isSpectator = view.isSpectator || Boolean(access?.readOnly);
  return {
    ...view,
    isSpectator,
    dispatch: isSpectator || !access ? NO_DISPATCH : access.dispatch,
  };
}
