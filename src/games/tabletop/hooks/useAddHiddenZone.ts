/**
 * Adds a hidden zone owned by the viewer's seat [ID: HOOK-TABLETOP-ADD-HIDDEN-ZONE]
 */
import type { Dispatch } from 'react';
import { createDefaultHiddenZone } from '../logic/hiddenZoneLogic';
import type { TabletopAction } from '../logic/tabletopReducer';
import type { SeatWidget } from '../logic/types';

export function useAddHiddenZone(
  table: { width: number; height: number },
  seat: SeatWidget | undefined,
  dispatch: Dispatch<TabletopAction>,
) {
  return () => {
    const zone = createDefaultHiddenZone(`hz_${Date.now()}`, table.width, table.height, {
      ownerSeat: seat?.index,
      color: seat?.color,
    });
    dispatch({ type: 'ADD_HIDDEN_ZONE', payload: { zone } });
  };
}
