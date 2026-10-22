/**
 * Seat chips and the player overview on the table surface [ID: GAME-TABLETOP-SURFACE-SEATS]
 */
import React, { useState } from 'react';
import type { TabletopAction } from '../../logic/tabletopReducer';
import type { SeatWidget, TabletopWidget } from '../../logic/types';
import { PlayerSeatSelector } from './PlayerSeatSelector';
import { PlayerOverviewHud } from './PlayerOverviewHud';

export const SurfaceSeatControls: React.FC<{
  seats: SeatWidget[];
  widgets: Record<string, TabletopWidget>;
  currentSeatId?: string;
  dispatch: React.Dispatch<TabletopAction>;
  /** Seat chips hidden: TV view, or pass and play (seats change only through the handover). */
  hideSelector: boolean;
}> = ({ seats, widgets, currentSeatId, dispatch, hideSelector }) => {
  const [hudOpen, setHudOpen] = useState(false);
  if (seats.length === 0) return null;
  return (
    <>
      {!hideSelector && (
        <PlayerSeatSelector
          seats={seats}
          currentSeatId={currentSeatId}
          onSelectSeat={(seatId) => dispatch({ type: 'SELECT_SEAT', payload: { seatId } })}
          onToggleHud={() => setHudOpen(true)}
        />
      )}
      <PlayerOverviewHud
        open={hudOpen}
        onClose={() => setHudOpen(false)}
        seats={seats}
        widgets={widgets}
        currentSeatId={currentSeatId}
      />
    </>
  );
};
