/**
 * Holders and widgets the current viewer sees on the table canvas [ID: HOOK-TABLETOP-BOARD-LAYERS]
 *
 * Applies viewport culling and the board filters, and leaves out the contents of other players'
 * hidden zones (only their overlay is rendered).
 */
import { useMemo } from 'react';
import type { TabletopGameDefinition } from '../logic/types';
import type { TransformState } from './useTabletopEngine';
import { useViewportCulling } from './useViewportCulling';
import { filterBoardHolders, filterBoardWidgets } from '../logic/boardFilter';
import { filterVisibleForViewer } from '../logic/hiddenZoneLogic';

export function useBoardLayers(
  game: TabletopGameDefinition,
  transform: TransformState,
  containerSize: { width: number; height: number },
  isTvMode: boolean,
  seatIndex: number | undefined,
) {
  const { widgets, hiddenZones } = game;
  const visibleIds = useViewportCulling(
    widgets,
    transform,
    containerSize.width,
    containerSize.height,
  );

  const boardHolders = useMemo(
    () =>
      filterVisibleForViewer(
        filterBoardHolders(widgets, visibleIds, isTvMode),
        hiddenZones,
        seatIndex,
      ),
    [widgets, visibleIds, isTvMode, hiddenZones, seatIndex],
  );

  const boardWidgets = useMemo(
    () =>
      filterVisibleForViewer(
        filterBoardWidgets(widgets, visibleIds, isTvMode),
        hiddenZones,
        seatIndex,
      ),
    [widgets, visibleIds, isTvMode, hiddenZones, seatIndex],
  );

  return { boardHolders, boardWidgets };
}
