/**
 * Drawing pieces from bags [ID: LOGIC-TABLETOP-BAG-REDUCER]
 */
import type { TabletopWidget, HolderWidget, BagWidget } from '../types';
import type { TabletopAction, TabletopGameState } from '../tabletopReducer';

export type BagAction = Extract<TabletopAction, { type: 'DRAW_FROM_BAG' }>;

export function bagReducer(state: TabletopGameState, action: BagAction): TabletopGameState {
  switch (action.type) {
    case 'DRAW_FROM_BAG': {
      const bagWidget = state.game.widgets[action.payload.bagId];
      if (!bagWidget || bagWidget.type !== 'bag') return state;
      const bag = bagWidget as BagWidget;
      const widgets: Record<string, TabletopWidget> = { ...state.game.widgets };

      if (bag.isInfinite && bag.templateWidget) {
        const template = bag.templateWidget;
        const spawnedId =
          action.payload.spawnedId ||
          `tok_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

        let nextX = bag.x + bag.width + 16;
        let nextY = bag.y;

        if (action.payload.position) {
          nextX = action.payload.position.x;
          nextY = action.payload.position.y;
        } else if (action.payload.targetHolderId && widgets[action.payload.targetHolderId]) {
          const holder = widgets[action.payload.targetHolderId] as HolderWidget;
          const childIndex = holder.childIds?.length || 0;
          widgets[holder.id] = {
            ...holder,
            childIds: [...(holder.childIds || []), spawnedId],
          };
          const spread = Math.min(30, (holder.width - 40) / Math.max(1, childIndex + 1));
          nextX = holder.x + 10 + childIndex * spread;
          nextY = holder.y + 10;
        }

        const maxZ = Math.max(1, ...Object.values(widgets).map((w) => w.zIndex || 0));

        const cloned: TabletopWidget = {
          ...template,
          id: spawnedId,
          x: nextX,
          y: nextY,
          zIndex: maxZ + 1,
          movable: true,
          pinned: false,
        };

        widgets[spawnedId] = cloned;

        return {
          ...state,
          game: {
            ...state.game,
            widgets,
            updatedAt: Date.now(),
          },
        };
      } else if (!bag.isInfinite && bag.itemIds && bag.itemIds.length > 0) {
        const drawnId = bag.itemIds[bag.itemIds.length - 1];
        const remainingItemIds = bag.itemIds.filter((id) => id !== drawnId);

        widgets[bag.id] = {
          ...bag,
          itemIds: remainingItemIds,
          itemCount: remainingItemIds.length,
        };

        let nextX = bag.x + bag.width + 16;
        let nextY = bag.y;
        if (action.payload.position) {
          nextX = action.payload.position.x;
          nextY = action.payload.position.y;
        }

        const item = widgets[drawnId];
        if (item) {
          widgets[drawnId] = {
            ...item,
            x: nextX,
            y: nextY,
            movable: true,
            pinned: false,
          };
        }

        return {
          ...state,
          game: {
            ...state.game,
            widgets,
            updatedAt: Date.now(),
          },
        };
      }

      return state;
    }
  }
}
