/**
 * Hook for managing Tabletop pan/zoom transforms and pointer drags [ID: HOOK-TABLETOP-ENGINE]
 *
 * Decks and bags are sources (see `sourcePress.ts`): tap deals, drag deals and drags the
 * item, a long press picks up the whole source. Shaking a dragged deck or die calls
 * `onShake` with the shuffle / roll action; dragging alone never rolls or shuffles.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { TabletopWidget, GridSnapDef, TokenWidget } from '../logic/types';
import { isCardInHand } from '../logic/handLayout';
import { findMatchingSupplyHolder, findSnapTargetAt } from '../logic/boardFilter';
import {
  createShakeTracker,
  DRAG_THRESHOLD_PX,
  LONG_PRESS_MS,
  shakeActionFor,
  sourceKind,
} from '../logic/tableGestures';
import type { TabletopAction } from '../logic/tabletopReducer';
import { snapToGridCoords } from '../logic/gridLogic';
import { dealFromSource, tapSource, type SourcePress } from './sourcePress';
import { usePanPinch } from './usePanPinch';
export type { GridSnapDef };
export type { TransformState } from './usePanPinch';
export { snapToGridCoords };

export interface TabletopEngineOptions {
  tableWidth: number;
  tableHeight: number;
  widgets: Record<string, TabletopWidget>;
  currentSeatIndex?: number;
  /** Viewer's hand (tap on a deck, drop on the dock); none for spectators. */
  handHolderId?: string;
  /** False for spectators: decks and bags behave like ordinary widgets and never deal. */
  canDraw?: boolean;
  onMoveWidget: (id: string, x: number, y: number) => void;
  onSnapToHolder: (widgetId: string, holderId: string) => void;
  onDoubleClickWidget?: (widgetId: string) => void;
  onDrawCardAt?: (deckId: string, x: number, y: number, cardId?: string, faceUp?: boolean) => void;
  onDrawFromBag?: (bagId: string, position?: { x: number; y: number }, spawnedId?: string) => void;
  /** Shaking a dragged deck or die: the shuffle / roll action to dispatch. */
  onShake?: (action: TabletopAction) => void;
  /** Long press on a source released without moving: open its context menu. */
  onLongPressRelease?: (widgetId: string, clientX: number, clientY: number) => void;
}

interface DragStart {
  /** Widget that follows the pointer (changes from the source to the dealt item). */
  id: string;
  pointerX: number;
  pointerY: number;
  widgetX: number;
  widgetY: number;
  source?: SourcePress;
}

/** Height of the hand dock below the table: dropping there puts a widget in the hand. */
const DOCK_HEIGHT = 156;

const isMovable = (w?: TabletopWidget) => Boolean(w && !w.pinned && w.movable !== false);

export function useTabletopEngine(options: TabletopEngineOptions) {
  const view = usePanPinch();
  const { transform, endPan } = view;
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [isDraggingActive, setIsDraggingActive] = useState(false);
  const [dragPointer, setDragPointer] = useState<{ x: number; y: number } | null>(null);
  const [grabOffset, setGrabOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);

  const dragStartRef = useRef<DragStart | null>(null);
  const hasMovedRef = useRef(false);
  const lastClickRef = useRef<{ id: string; time: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeRef = useRef(createShakeTracker());

  const clearTimers = useCallback(() => {
    if (longPressTimerRef.current !== null) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const screenToBoard = useCallback(
    (screenX: number, screenY: number, containerRect: DOMRect): { x: number; y: number } => ({
      x: (screenX - containerRect.left - transform.x) / transform.scale,
      y: (screenY - containerRect.top - transform.y) / transform.scale,
    }),
    [transform],
  );

  const beginDrag = (e: React.PointerEvent, widget: TabletopWidget, source?: SourcePress) => {
    setActiveDragId(widget.id);
    setIsDraggingActive(false);
    dragStartRef.current = {
      id: widget.id,
      pointerX: e.clientX,
      pointerY: e.clientY,
      widgetX: widget.x,
      widgetY: widget.y,
      source,
    };
    hasMovedRef.current = false;
    shakeRef.current.reset();
  };

  const startLongPressTimer = () => {
    longPressTimerRef.current = setTimeout(() => {
      const start = dragStartRef.current;
      if (!start?.source || hasMovedRef.current) return;
      start.source.longPressed = true;
      navigator.vibrate?.(15);
      // Lift the source under the finger as feedback.
      setIsDraggingActive(true);
      setDragPointer({ x: start.pointerX, y: start.pointerY });
    }, LONG_PRESS_MS);
  };

  const handlePointerDownWidget = (e: React.PointerEvent, widget: TabletopWidget) => {
    const canvasRect = document.getElementById('tabletop-board-canvas')?.getBoundingClientRect();
    setGrabOffset({
      x: e.clientX - ((canvasRect?.left ?? 0) + widget.x * transform.scale),
      y: e.clientY - ((canvasRect?.top ?? 0) + widget.y * transform.scale),
    });

    // Decks and bags deal on tap and drag; a long press picks up the whole source.
    const canDeal = e.isPrimary && e.button === 0;
    const kind = canDeal ? sourceKind(widget, options.canDraw !== false) : null;
    if (kind) {
      e.stopPropagation();
      clearTimers();
      beginDrag(e, widget, { id: widget.id, kind, longPressed: false, dealt: false });
      startLongPressTimer();
      return;
    }

    if (!isMovable(widget)) {
      view.handleStartPan(e);
      return;
    }
    e.stopPropagation();
    if (view.startPinch(e) || !e.isPrimary) return;
    beginDrag(e, widget);
  };

  /** First drag step off a source deals an item; false when the drag must not move. */
  const prepareSourceDrag = (start: DragStart): boolean => {
    const src = start.source;
    if (!src) return true;
    if (src.longPressed) return isMovable(options.widgets[src.id]);
    if (src.dealt) return true;
    clearTimers();
    const source = options.widgets[src.id];
    const itemId = source ? dealFromSource(options, source) : null;
    if (!itemId) return false;
    src.dealt = true;
    start.id = itemId;
    setActiveDragId(itemId);
    return true;
  };

  const handlePointerMove = (e: PointerEvent | React.PointerEvent) => {
    if (view.pinchMove(e)) return;
    const start = dragStartRef.current;
    if (!start) {
      view.panMove(e);
      return;
    }
    const dist = Math.hypot(e.clientX - start.pointerX, e.clientY - start.pointerY);
    if (!hasMovedRef.current && dist < DRAG_THRESHOLD_PX) return;
    if (!prepareSourceDrag(start)) return;
    hasMovedRef.current = true;
    setIsDraggingActive(true);
    setDragPointer({ x: e.clientX, y: e.clientY });
    const dragId = start.id;
    const newX = Math.round(start.widgetX + (e.clientX - start.pointerX) / transform.scale);
    const newY = Math.round(start.widgetY + (e.clientY - start.pointerY) / transform.scale);
    const dragged = options.widgets[dragId];
    if (dragged) {
      const { width, height, type } = dragged;
      setHoveredTargetId(findSnapTargetAt(options.widgets, newX, newY, width, height, type));
      const shake = shakeActionFor(dragged);
      if (shake && shakeRef.current.push(e.clientX, e.clientY, e.timeStamp))
        options.onShake?.(shake);
    }
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      options.onMoveWidget(dragId, newX, newY);
      rafRef.current = null;
    });
  };

  const endDrag = useCallback(() => {
    clearTimers();
    setActiveDragId(null);
    setIsDraggingActive(false);
    setDragPointer(null);
    setHoveredTargetId(null);
    dragStartRef.current = null;
    endPan();
  }, [clearTimers, endPan]);

  /** Dropped on the dock: tokens go back to their supply, everything else into the hand. */
  const dropOnDock = (dragId: string): boolean => {
    const dragged = options.widgets[dragId];
    const supply =
      dragged?.type === 'token'
        ? findMatchingSupplyHolder(
            dragged as TokenWidget,
            options.widgets,
            options.currentSeatIndex,
          )
        : undefined;
    const target =
      supply ?? (options.handHolderId ? options.widgets[options.handHolderId] : undefined);
    if (target) options.onSnapToHolder(dragId, target.id);
    return Boolean(target);
  };

  const registerClick = (dragId: string) => {
    if (isCardInHand(dragId, options.widgets)) return;
    const now = Date.now();
    const last = lastClickRef.current;
    if (last && last.id === dragId && now - last.time < 500) {
      options.onDoubleClickWidget?.(dragId);
      lastClickRef.current = null;
    } else {
      lastClickRef.current = { id: dragId, time: now };
    }
  };

  const dropOnTable = (dragId: string) => {
    const widget = options.widgets[dragId];
    if (!widget) return;
    let { x, y } = widget;
    if (Array.isArray(widget.grid) && widget.grid.length > 0) {
      const snapped = snapToGridCoords(widget, x, y, widget.grid as GridSnapDef[]);
      if (snapped) {
        ({ x, y } = snapped);
        options.onMoveWidget(dragId, x, y);
      }
    }
    const targetId = findSnapTargetAt(
      options.widgets,
      x,
      y,
      widget.width,
      widget.height,
      widget.type,
    );
    if (targetId && targetId !== dragId) options.onSnapToHolder(dragId, targetId);
  };

  const handlePointerUp = (e: PointerEvent | React.PointerEvent) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    view.endPinch();
    if (!e.isPrimary) return;
    const start = dragStartRef.current;
    if (!start) {
      endPan();
      return;
    }
    const dragId = start.id;
    const isClick = !hasMovedRef.current;

    if (start.source && isClick) {
      const source = options.widgets[start.source.id];
      if (start.source.longPressed)
        options.onLongPressRelease?.(start.source.id, e.clientX, e.clientY);
      else if (source) tapSource(options, source);
    } else if (isClick) {
      registerClick(dragId);
    } else if (!(e.clientY >= window.innerHeight - DOCK_HEIGHT && dropOnDock(dragId))) {
      dropOnTable(dragId);
    }
    endDrag();
  };

  /** A press on a deck or bag is in progress (the native long-press menu would interrupt it). */
  const isPressingSource = useCallback(() => Boolean(dragStartRef.current?.source), []);

  const moveRef = useRef(handlePointerMove);
  const upRef = useRef(handlePointerUp);

  useEffect(() => {
    moveRef.current = handlePointerMove;
    upRef.current = handlePointerUp;
  });

  const { isPanning } = view;
  useEffect(() => {
    if (!activeDragId && !isPanning) return;
    const onMove = (e: PointerEvent) => moveRef.current(e);
    const onUp = (e: PointerEvent) => upRef.current(e);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', endDrag);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', endDrag);
    };
  }, [activeDragId, isPanning, endDrag]);

  useEffect(() => clearTimers, [clearTimers]);

  return {
    transform,
    setTransform: view.setTransform,
    activeDragId,
    isDraggingActive,
    dragPointer,
    grabOffset,
    screenToBoard,
    hoveredTargetId,
    isPressingSource,
    handlePointerDownWidget,
    handlePointerMove,
    handlePointerUp,
    handleStartPan: view.handleStartPan,
    zoomIn: view.zoomIn,
    zoomOut: view.zoomOut,
    resetZoom: view.resetZoom,
  };
}
