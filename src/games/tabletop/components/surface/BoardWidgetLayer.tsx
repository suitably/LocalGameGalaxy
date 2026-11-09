/**
 * Board holders and widgets of the table canvas [ID: COMP-TABLETOP-BOARD-WIDGET-LAYER]
 *
 * Hands the memoised widget views the same two handlers on every render, so a pointer move
 * re-renders only the dragged widget, not all 800 (#684). A lifted card, token or die is drawn by
 * `BoardDragOverlay` and its board copy is hidden; any other dragged widget is drawn at the live
 * position from `dragFrameStore`. The state position follows at most every 50 ms (`moveCoalescer.ts`).
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { HolderWidget, TabletopWidget } from '../../logic/types';
import type { TabletopAction } from '../../logic/tabletopReducer';
import {
  useDragFrame,
  type DragFrame,
  type DragFrameStore,
  type DragPosition,
} from '../../hooks/dragFrameStore';
import { HolderWidgetView } from '../widgets/HolderWidgetView';
import { BoardWidgetRenderer, type BoardContextMenuEvent } from './BoardWidgetRenderer';
import { OVERLAY_WIDGET_TYPES } from '../../logic/dragGesture';

interface BoardWidgetLayerProps {
  holders: HolderWidget[];
  widgets: TabletopWidget[];
  hoveredTargetId: string | null;
  /** Widget lifted by an active drag. */
  draggingId: string | null;
  /** Live drag frames: read only for a dragged widget the overlay does not draw. */
  dragFrames: DragFrameStore;
  obscuredIds: Set<string>;
  dispatch: React.Dispatch<TabletopAction>;
  onPointerDownWidget: (e: React.PointerEvent, widget: TabletopWidget) => void;
  onContextMenuWidget: (e: BoardContextMenuEvent, widget: TabletopWidget) => void;
}

const noPosition = () => null;
const selectPosition = (frame: DragFrame | null) => frame?.position ?? null;

const atDragPosition = (w: TabletopWidget, pos: DragPosition | null): TabletopWidget =>
  pos && pos.id === w.id && (pos.x !== w.x || pos.y !== w.y) ? { ...w, x: pos.x, y: pos.y } : w;

export const BoardWidgetLayer: React.FC<BoardWidgetLayerProps> = ({
  holders,
  widgets,
  hoveredTargetId,
  draggingId,
  dragFrames,
  obscuredIds,
  dispatch,
  onPointerDownWidget,
  onContextMenuWidget,
}) => {
  const handlers = useRef({ onPointerDownWidget, onContextMenuWidget });
  useEffect(() => {
    handlers.current = { onPointerDownWidget, onContextMenuWidget };
  });
  const onPointerDown = useCallback(
    (e: React.PointerEvent, w: TabletopWidget) => handlers.current.onPointerDownWidget(e, w),
    [],
  );
  const onContextMenu = useCallback(
    (e: BoardContextMenuEvent, w: TabletopWidget) => handlers.current.onContextMenuWidget(e, w),
    [],
  );

  // Only a widget the overlay does not draw follows the pointer here; otherwise the list stays
  // the same elements during a drag and React skips it on every pointer move.
  const lifted = widgets.find((w) => w.id === draggingId);
  const followsPointer = Boolean(lifted && !OVERLAY_WIDGET_TYPES.has(lifted.type));
  const livePosition = useDragFrame(dragFrames, followsPointer ? selectPosition : noPosition);
  const widgetViews = useMemo(
    () =>
      widgets.map((w) => (
        <BoardWidgetRenderer
          key={w.id}
          widget={atDragPosition(w, livePosition)}
          isDragging={draggingId === w.id}
          hidden={draggingId === w.id && OVERLAY_WIDGET_TYPES.has(w.type)}
          onPointerDown={onPointerDown}
          onContextMenu={onContextMenu}
          dispatch={dispatch}
          obscured={obscuredIds.has(w.id)}
        />
      )),
    [widgets, livePosition, draggingId, obscuredIds, dispatch, onPointerDown, onContextMenu],
  );

  return (
    <>
      {holders.map((w) => (
        <HolderWidgetView key={w.id} widget={w} isHovered={w.id === hoveredTargetId} />
      ))}
      {widgetViews}
    </>
  );
};
