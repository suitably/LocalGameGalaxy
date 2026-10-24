import { useMemo } from 'react';
import { getHiddenWidgetIds } from '../logic/hiddenZoneLogic';
import type { TabletopGameDefinition } from '../logic/types';

/** Widget ids obscured by hidden zones for the viewer seat index. */
export function useObscuredWidgetIds(
  game: Pick<TabletopGameDefinition, 'widgets' | 'hiddenZones'>,
  viewerSeatIndex?: number,
): Set<string> {
  return useMemo(
    () =>
      getHiddenWidgetIds({ widgets: game.widgets, hiddenZones: game.hiddenZones }, viewerSeatIndex),
    [game.widgets, game.hiddenZones, viewerSeatIndex],
  );
}
