/**
 * Viewer seat, spectator flag and hand for surface and dock [ID: HOOK-TABLETOP-SEAT-VIEW]
 */
import { useMemo } from 'react';
import type { TabletopGameState } from '../logic/tabletopReducer';
import { resolveSeatView } from '../logic/seatLogic';

export function useSeatView(state: TabletopGameState) {
  const { widgets } = state.game;
  return useMemo(
    () => resolveSeatView(widgets, state.currentSeatId),
    [widgets, state.currentSeatId],
  );
}
