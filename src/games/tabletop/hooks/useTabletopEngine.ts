/**
 * Hook for managing Tabletop pan/zoom transforms and pointer drags [ID: HOOK-TABLETOP-ENGINE]
 */
import { useState, useCallback, useRef } from 'react';
import type { TabletopWidget, HolderWidget } from '../logic/types';

export interface TransformState {
  x: number;
  y: number;
  scale: number;
}

export function useTabletopEngine(options: {
  tableWidth: number;
  tableHeight: number;
  widgets: Record<string, TabletopWidget>;
  onMoveWidget: (id: string, x: number, y: number) => void;
  onSnapToHolder: (widgetId: string, holderId: string) => void;
}) {
  const [transform, setTransform] = useState<TransformState>({ x: 0, y: 0, scale: 1 });
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const dragStartRef = useRef<{ pointerX: number; pointerY: number; widgetX: number; widgetY: number } | null>(null);
  const panStartRef = useRef<{ pointerX: number; pointerY: number; startX: number; startY: number } | null>(null);
  const secondPointerRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1);

  // Screen -> Board coordinate transform
  const screenToBoard = useCallback(
    (screenX: number, screenY: number, containerRect: DOMRect): { x: number; y: number } => {
      const relX = screenX - containerRect.left - transform.x;
      const relY = screenY - containerRect.top - transform.y;
      return {
        x: relX / transform.scale,
        y: relY / transform.scale,
      };
    },
    [transform],
  );

  // Check collision with any holder widget
  const findCollidingHolder = useCallback(
    (widgetX: number, widgetY: number, widgetWidth: number, widgetHeight: number): string | null => {
      const centerX = widgetX + widgetWidth / 2;
      const centerY = widgetY + widgetHeight / 2;

      for (const [id, w] of Object.entries(options.widgets)) {
        if (w.type === 'holder') {
          const h = w as HolderWidget;
          if (
            centerX >= h.x &&
            centerX <= h.x + h.width &&
            centerY >= h.y &&
            centerY <= h.y + h.height
          ) {
            return id;
          }
        }
      }
      return null;
    },
    [options.widgets],
  );

  const handlePointerDownWidget = (e: React.PointerEvent, widget: TabletopWidget) => {
    e.stopPropagation();
    if (!e.isPrimary && panStartRef.current) {
      secondPointerRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      const primary = panStartRef.current;
      pinchStartDistRef.current = Math.hypot(
        e.clientX - primary.pointerX,
        e.clientY - primary.pointerY
      );
      pinchStartScaleRef.current = transform.scale;
      return;
    }
    if (!e.isPrimary) return;
    setActiveDragId(widget.id);
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      widgetX: widget.x,
      widgetY: widget.y,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (secondPointerRef.current && pinchStartDistRef.current !== null) {
      const primary = panStartRef.current;
      if (!primary) return;
      const other = secondPointerRef.current;
      const p1x = e.isPrimary ? e.clientX : primary.pointerX;
      const p1y = e.isPrimary ? e.clientY : primary.pointerY;
      const p2x = e.isPrimary ? other.x : e.clientX;
      const p2y = e.isPrimary ? other.y : e.clientY;
      const currentDist = Math.hypot(p2x - p1x, p2y - p1y);
      const newScale = Math.min(3.0, Math.max(0.2,
        pinchStartScaleRef.current * (currentDist / pinchStartDistRef.current)
      ));
      setTransform((prev) => ({ ...prev, scale: newScale }));
      return;
    }

    if (activeDragId && dragStartRef.current) {
      const deltaX = (e.clientX - dragStartRef.current.pointerX) / transform.scale;
      const deltaY = (e.clientY - dragStartRef.current.pointerY) / transform.scale;
      const newX = Math.round(dragStartRef.current.widgetX + deltaX);
      const newY = Math.round(dragStartRef.current.widgetY + deltaY);
      options.onMoveWidget(activeDragId, newX, newY);
    } else if (panStartRef.current) {
      const start = panStartRef.current;
      const deltaX = e.clientX - start.pointerX;
      const deltaY = e.clientY - start.pointerY;
      const nextX = start.startX + deltaX;
      const nextY = start.startY + deltaY;
      setTransform((prev) => ({
        ...prev,
        x: nextX,
        y: nextY,
      }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!e.isPrimary) {
      secondPointerRef.current = null;
      pinchStartDistRef.current = null;
      return;
    }
    secondPointerRef.current = null;
    pinchStartDistRef.current = null;
    if (activeDragId) {
      const widget = options.widgets[activeDragId];
      if (widget) {
        const holderId = findCollidingHolder(widget.x, widget.y, widget.width, widget.height);
        if (holderId) {
          options.onSnapToHolder(activeDragId, holderId);
        }
      }
      setActiveDragId(null);
      dragStartRef.current = null;
    }
    panStartRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignore if pointer was not captured
    }
  };

  const handleStartPan = (e: React.PointerEvent) => {
    if (!e.isPrimary && panStartRef.current) {
      secondPointerRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      const primary = panStartRef.current;
      pinchStartDistRef.current = Math.hypot(
        e.clientX - primary.pointerX,
        e.clientY - primary.pointerY
      );
      pinchStartScaleRef.current = transform.scale;
      return;
    }
    if (e.button !== 0) return;
    panStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: transform.x,
      startY: transform.y,
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }
  };

  const zoomIn = () => setTransform((t) => ({ ...t, scale: Math.min(2.5, t.scale + 0.15) }));
  const zoomOut = () => setTransform((t) => ({ ...t, scale: Math.max(0.4, t.scale - 0.15) }));
  const resetZoom = () => setTransform({ x: 0, y: 0, scale: 1 });

  return {
    transform,
    setTransform,
    activeDragId,
    screenToBoard,
    handlePointerDownWidget,
    handlePointerMove,
    handlePointerUp,
    handleStartPan,
    zoomIn,
    zoomOut,
    resetZoom,
  };
}
