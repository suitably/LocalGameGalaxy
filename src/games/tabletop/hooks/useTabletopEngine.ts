/**
 * Hook for managing Tabletop pan/zoom transforms and pointer drags [ID: HOOK-TABLETOP-ENGINE]
 */
import { useState, useCallback, useRef } from 'react';
import type { TabletopWidget, HolderWidget, DeckWidget, GridSnapDef } from '../logic/types';
import { isCardInHand } from '../logic/handLayout';
export type { GridSnapDef };

export interface TransformState {
  x: number;
  y: number;
  scale: number;
}

import { snapToGridCoords } from '../logic/gridLogic';
export { snapToGridCoords };
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3.0;

export interface TabletopEngineOptions {
  tableWidth: number;
  tableHeight: number;
  widgets: Record<string, TabletopWidget>;
  currentSeatIndex?: number;
  onMoveWidget: (id: string, x: number, y: number) => void;
  onSnapToHolder: (widgetId: string, holderId: string) => void;
  onDoubleClickWidget?: (widgetId: string) => void;
  onDrawCardAt?: (deckId: string, x: number, y: number) => void;
}

export function useTabletopEngine(options: TabletopEngineOptions) {
  const [transform, setTransform] = useState<TransformState>({ x: 0, y: 0, scale: 1 });
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [isDraggingActive, setIsDraggingActive] = useState(false);
  const [dragPointer, setDragPointer] = useState<{ x: number; y: number } | null>(null);
  const [grabOffset, setGrabOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const dragStartRef = useRef<{ pointerX: number; pointerY: number; widgetX: number; widgetY: number; isDeckDraw?: boolean } | null>(null);
  const hasMovedRef = useRef(false);
  const lastClickRef = useRef<{ id: string; time: number } | null>(null);
  const panStartRef = useRef<{ pointerX: number; pointerY: number; startX: number; startY: number } | null>(null);
  const secondPointerRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(1);
  const captureTargetRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const screenToBoard = useCallback(
    (screenX: number, screenY: number, containerRect: DOMRect): { x: number; y: number } => ({
      x: (screenX - containerRect.left - transform.x) / transform.scale,
      y: (screenY - containerRect.top - transform.y) / transform.scale,
    }),
    [transform],
  );

  const findCollidingTarget = useCallback(
    (widgetX: number, widgetY: number, widgetWidth: number, widgetHeight: number): string | null => {
      const cx = widgetX + widgetWidth / 2, cy = widgetY + widgetHeight / 2;
      for (const [id, w] of Object.entries(options.widgets)) {
        if (w.type === 'holder' || w.type === 'deck') {
          if (cx >= w.x && cx <= w.x + w.width && cy >= w.y && cy <= w.y + w.height) return id;
        }
      }
      return null;
    },
    [options.widgets],
  );

  const handlePointerDownWidget = (e: React.PointerEvent, widget: TabletopWidget) => {
    const canvasEl = document.getElementById('tabletop-board-canvas');
    const canvasRect = canvasEl?.getBoundingClientRect();
    const canvasLeft = canvasRect ? canvasRect.left : 0;
    const canvasTop = canvasRect ? canvasRect.top : 0;
    setGrabOffset({
      x: e.clientX - (canvasLeft + widget.x * transform.scale),
      y: e.clientY - (canvasTop + widget.y * transform.scale),
    });

    // If deck has cards, dragging it draws the top card!
    if (widget.type === 'deck') {
      const deck = widget as DeckWidget;
      if (deck.cardIds && deck.cardIds.length > 0) {
        e.stopPropagation();
        const topCardId = deck.cardIds[0];
        options.onDrawCardAt?.(deck.id, deck.x, deck.y);
        setActiveDragId(topCardId);
        setIsDraggingActive(false);
        dragStartRef.current = { pointerX: e.clientX, pointerY: e.clientY, widgetX: deck.x, widgetY: deck.y, isDeckDraw: true };
        hasMovedRef.current = false;
        captureTargetRef.current = e.target as HTMLElement;
        captureTargetRef.current.setPointerCapture?.(e.pointerId);
        return;
      }
    }

    if (widget.pinned || widget.movable === false) {
      handleStartPan(e);
      return;
    }

    e.stopPropagation();
    if (!e.isPrimary && panStartRef.current) {
      secondPointerRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      const primary = panStartRef.current;
      pinchStartDistRef.current = Math.hypot(e.clientX - primary.pointerX, e.clientY - primary.pointerY);
      pinchStartScaleRef.current = transform.scale;
      return;
    }
    if (!e.isPrimary) return;
    setActiveDragId(widget.id);
    setIsDraggingActive(false);
    dragStartRef.current = { pointerX: e.clientX, pointerY: e.clientY, widgetX: widget.x, widgetY: widget.y };
    hasMovedRef.current = false;
    captureTargetRef.current = e.target as HTMLElement;
    captureTargetRef.current.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (secondPointerRef.current && pinchStartDistRef.current !== null) {
      const primary = panStartRef.current;
      if (!primary) return;
      const other = secondPointerRef.current;
      const p1x = e.isPrimary ? e.clientX : primary.pointerX, p1y = e.isPrimary ? e.clientY : primary.pointerY;
      const p2x = e.isPrimary ? other.x : e.clientX, p2y = e.isPrimary ? other.y : e.clientY;
      const currentDist = Math.hypot(p2x - p1x, p2y - p1y);
      const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchStartScaleRef.current * (currentDist / pinchStartDistRef.current)));
      setTransform((prev) => ({ ...prev, scale: newScale }));
      return;
    }

    if (activeDragId && dragStartRef.current) {
      const dist = Math.hypot(e.clientX - dragStartRef.current.pointerX, e.clientY - dragStartRef.current.pointerY);
      if (dist >= 6) {
        hasMovedRef.current = true;
        setIsDraggingActive(true);
        setDragPointer({ x: e.clientX, y: e.clientY });
        const deltaX = (e.clientX - dragStartRef.current.pointerX) / transform.scale;
        const deltaY = (e.clientY - dragStartRef.current.pointerY) / transform.scale;
        const newX = Math.round(dragStartRef.current.widgetX + deltaX);
        const newY = Math.round(dragStartRef.current.widgetY + deltaY);
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          options.onMoveWidget(activeDragId, newX, newY);
          rafRef.current = null;
        });
      }
    } else if (panStartRef.current) {
      const start = panStartRef.current;
      setTransform((prev) => ({ ...prev, x: start.startX + (e.clientX - start.pointerX), y: start.startY + (e.clientY - start.pointerY) }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (!e.isPrimary) { secondPointerRef.current = null; pinchStartDistRef.current = null; return; }
    secondPointerRef.current = null;
    pinchStartDistRef.current = null;

    if (activeDragId) {
      const isClick = !hasMovedRef.current;
      const isDroppedInDock = e.clientY >= window.innerHeight - 156;

      if (isDroppedInDock) {
        const draggedWidget = options.widgets[activeDragId];
        const seatIdx = options.currentSeatIndex;
        const hasSeat = typeof seatIdx === 'number';
        const seatPrefix = hasSeat ? `player ${seatIdx}` : '';

        if (draggedWidget?.type === 'token') {
          const matchingHolder = Object.values(options.widgets).find((w) => {
            if (w.type !== 'holder') return false;
            const hId = w.id.toLowerCase();
            if (hasSeat && !hId.includes(seatPrefix) && w.ownerSeat !== seatIdx && w.ownerSeat !== (seatIdx - 1)) {
              return false;
            }
            const wLabel = (draggedWidget.label || draggedWidget.id).toLowerCase();
            if (wLabel.includes('road') && hId.includes('road')) return true;
            if (wLabel.includes('settlement') && hId.includes('settlement')) return true;
            if (wLabel.includes('city') && hId.includes('city')) return true;
            if (wLabel.includes('ship') && hId.includes('ship')) return true;
            return false;
          }) || Object.values(options.widgets).find((w) => {
            if (w.type !== 'holder') return false;
            const hId = w.id.toLowerCase();
            const wLabel = (draggedWidget.label || draggedWidget.id).toLowerCase();
            if (wLabel.includes('road') && hId.includes('road')) return true;
            if (wLabel.includes('settlement') && hId.includes('settlement')) return true;
            if (wLabel.includes('city') && hId.includes('city')) return true;
            if (wLabel.includes('ship') && hId.includes('ship')) return true;
            return false;
          });
          if (matchingHolder) {
            options.onSnapToHolder(activeDragId, matchingHolder.id);
            setActiveDragId(null);
            setIsDraggingActive(false);
            setDragPointer(null);
            dragStartRef.current = null;
            panStartRef.current = null;
            try { captureTargetRef.current?.releasePointerCapture?.(e.pointerId); captureTargetRef.current = null; } catch { /* ignore */ }
            return;
          }
        }

        const handHolder = (hasSeat ? Object.values(options.widgets).find(
          (w) => w.type === 'holder' && (w.id.toLowerCase().includes('hand') || (w as HolderWidget).isHand) &&
                 (w.id.toLowerCase().includes(seatPrefix) || w.ownerSeat === seatIdx || w.ownerSeat === (seatIdx - 1))
        ) : undefined) || Object.values(options.widgets).find(
          (w) => w.type === 'holder' && (w.id.toLowerCase() === 'hand' || w.id.toLowerCase().includes('hand') || (w as HolderWidget).isHand)
        );
        if (handHolder) {
          options.onSnapToHolder(activeDragId, handHolder.id);
          setActiveDragId(null);
          setIsDraggingActive(false);
          setDragPointer(null);
          dragStartRef.current = null;
          panStartRef.current = null;
          try { captureTargetRef.current?.releasePointerCapture?.(e.pointerId); captureTargetRef.current = null; } catch { /* ignore */ }
          return;
        }
      }

      if (isClick) {
        if (dragStartRef.current?.isDeckDraw) {
          const handHolder = Object.values(options.widgets).find(
            (w) => w.type === 'holder' && (w.id.toLowerCase() === 'hand' || w.id.toLowerCase().includes('hand') || (w as HolderWidget).isHand)
          );
          if (handHolder) options.onSnapToHolder(activeDragId, handHolder.id);
        } else {
          const inHand = isCardInHand(activeDragId, options.widgets);
          if (!inHand) {
            const now = Date.now();
            if (lastClickRef.current && lastClickRef.current.id === activeDragId && now - lastClickRef.current.time < 500) {
              options.onDoubleClickWidget?.(activeDragId);
              lastClickRef.current = null;
            } else {
              lastClickRef.current = { id: activeDragId, time: now };
            }
          }
        }
      } else {
        const widget = options.widgets[activeDragId];
        if (widget) {
          let finalX = widget.x, finalY = widget.y;
          if (Array.isArray(widget.grid) && widget.grid.length > 0) {
            const snapped = snapToGridCoords(widget, widget.x, widget.y, widget.grid as GridSnapDef[]);
            if (snapped) { finalX = snapped.x; finalY = snapped.y; options.onMoveWidget(activeDragId, finalX, finalY); }
          }
          const targetId = findCollidingTarget(finalX, finalY, widget.width, widget.height);
          if (targetId && targetId !== activeDragId) {
            options.onSnapToHolder(activeDragId, targetId);
          }
        }
      }
      setActiveDragId(null);
      setIsDraggingActive(false);
      setDragPointer(null);
      dragStartRef.current = null;
    }
    panStartRef.current = null;
    try { captureTargetRef.current?.releasePointerCapture?.(e.pointerId); captureTargetRef.current = null; } catch { /* ignore */ }
  };

  const handleStartPan = (e: React.PointerEvent) => {
    if (!e.isPrimary && panStartRef.current) {
      secondPointerRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      const primary = panStartRef.current;
      pinchStartDistRef.current = Math.hypot(e.clientX - primary.pointerX, e.clientY - primary.pointerY);
      pinchStartScaleRef.current = transform.scale;
      return;
    }
    if (e.button !== 0) return;
    panStartRef.current = { pointerX: e.clientX, pointerY: e.clientY, startX: transform.x, startY: transform.y };
    try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } catch { /* ignore */ }
  };

  const zoomIn = () => setTransform((t) => ({ ...t, scale: Math.min(MAX_ZOOM, t.scale + 0.15) }));
  const zoomOut = () => setTransform((t) => ({ ...t, scale: Math.max(MIN_ZOOM, t.scale - 0.15) }));
  const resetZoom = () => setTransform({ x: 0, y: 0, scale: 1 });

  return {
    transform, setTransform, activeDragId, isDraggingActive, dragPointer,
    grabOffset, screenToBoard,
    handlePointerDownWidget, handlePointerMove, handlePointerUp, handleStartPan,
    zoomIn, zoomOut, resetZoom,
  };
}
