/**
 * Widget context menu wired to the table actions [ID: GAME-TABLETOP-SURFACE-CONTEXT-MENU]
 *
 * Right click, the native long press on touch, or a long press on a deck/bag released
 * without moving. Flip and shuffle/roll use the same actions as F / S and shaking.
 */
import React from 'react';
import type { TabletopAction } from '../../logic/tabletopReducer';
import type { TabletopWidget } from '../../logic/types';
import { flipActionFor, shakeActionFor } from '../../logic/tableGestures';
import { useZOrderShortcuts } from '../../hooks/useZOrderShortcuts';
import { WidgetContextMenu, type WidgetContextMenuPosition } from './WidgetContextMenu';

interface SurfaceContextMenuProps {
  position: WidgetContextMenuPosition | null;
  widgets: Record<string, TabletopWidget>;
  selectedIds: string[];
  onToggleSelect: (widgetId: string) => void;
  onClose: () => void;
  dispatch: React.Dispatch<TabletopAction>;
}

export const SurfaceContextMenu: React.FC<SurfaceContextMenuProps> = ({
  position,
  widgets,
  selectedIds,
  onToggleSelect,
  onClose,
  dispatch,
}) => {
  const reorderWidget = useZOrderShortcuts(selectedIds, dispatch);
  const run = (action: TabletopAction | null) => action && dispatch(action);

  return (
    <WidgetContextMenu
      position={position}
      widget={position ? widgets[position.widgetId] : undefined}
      isSelected={position ? selectedIds.includes(position.widgetId) : false}
      onClose={onClose}
      onToggleSelect={onToggleSelect}
      onToggleShowAlways={(id, cur) =>
        dispatch({ type: 'SET_WIDGET_SHOW_ALWAYS', payload: { widgetId: id, showAlways: !cur } })
      }
      onScaleWidget={(id, factor) =>
        dispatch({ type: 'SCALE_WIDGETS', payload: { widgetIds: [id], factor } })
      }
      onResetWidgetScale={(id) =>
        dispatch({ type: 'RESET_WIDGET_SCALE', payload: { widgetIds: [id] } })
      }
      onZOrder={reorderWidget}
      onFlip={(id) => run(flipActionFor(widgets[id]))}
      onShake={(id) => run(shakeActionFor(widgets[id]))}
    />
  );
};
