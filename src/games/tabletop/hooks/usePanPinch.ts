/**
 * Pan, pinch zoom and zoom buttons for the table view [ID: HOOK-TABLETOP-PAN-PINCH]
 */
import { useCallback, useRef, useState } from 'react';

export interface TransformState {
  x: number;
  y: number;
  scale: number;
}

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3.0;

type PointerLike = Pick<PointerEvent, 'clientX' | 'clientY' | 'isPrimary' | 'pointerId'>;

export function usePanPinch() {
  const [transform, setTransform] = useState<TransformState>({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const secondPointerRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(1);

  /** A second finger while panning starts a pinch; true when it did. */
  const startPinch = (e: PointerLike) => {
    const primary = panStartRef.current;
    if (e.isPrimary || !primary) return false;
    secondPointerRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    pinchStartDistRef.current = Math.hypot(
      e.clientX - primary.pointerX,
      e.clientY - primary.pointerY,
    );
    pinchStartScaleRef.current = transform.scale;
    return true;
  };

  const handleStartPan = (e: React.PointerEvent) => {
    if (startPinch(e)) return;
    if (e.button !== 0) return;
    panStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: transform.x,
      startY: transform.y,
    };
    setIsPanning(true);
  };

  /** Pinch zoom step; true when the move belonged to a pinch. */
  const pinchMove = (e: PointerLike) => {
    const primary = panStartRef.current;
    const other = secondPointerRef.current;
    const startDist = pinchStartDistRef.current;
    if (!other || startDist === null) return false;
    if (!primary) return true;
    const p1x = e.isPrimary ? e.clientX : primary.pointerX;
    const p1y = e.isPrimary ? e.clientY : primary.pointerY;
    const p2x = e.isPrimary ? other.x : e.clientX;
    const p2y = e.isPrimary ? other.y : e.clientY;
    const ratio = Math.hypot(p2x - p1x, p2y - p1y) / startDist;
    const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchStartScaleRef.current * ratio));
    setTransform((prev) => ({ ...prev, scale }));
    return true;
  };

  const panMove = (e: PointerLike) => {
    const pan = panStartRef.current;
    if (!pan) return;
    setTransform((prev) => ({
      ...prev,
      x: pan.startX + (e.clientX - pan.pointerX),
      y: pan.startY + (e.clientY - pan.pointerY),
    }));
  };

  const endPinch = () => {
    secondPointerRef.current = null;
    pinchStartDistRef.current = null;
  };

  const endPan = useCallback(() => {
    panStartRef.current = null;
    secondPointerRef.current = null;
    pinchStartDistRef.current = null;
    setIsPanning(false);
  }, []);

  const zoomIn = () => setTransform((t) => ({ ...t, scale: Math.min(MAX_ZOOM, t.scale + 0.15) }));
  const zoomOut = () => setTransform((t) => ({ ...t, scale: Math.max(MIN_ZOOM, t.scale - 0.15) }));
  const resetZoom = () => setTransform({ x: 0, y: 0, scale: 1 });

  return {
    transform,
    setTransform,
    isPanning,
    handleStartPan,
    startPinch,
    pinchMove,
    panMove,
    endPinch,
    endPan,
    zoomIn,
    zoomOut,
    resetZoom,
  };
}
