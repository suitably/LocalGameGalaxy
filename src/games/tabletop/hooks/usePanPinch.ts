/**
 * Pan, pinch zoom, wheel zoom and zoom buttons for the table view [ID: HOOK-TABLETOP-PAN-PINCH]
 *
 * Tracks every finger on the table: one pans, two pan and zoom around the point between them.
 * The gesture is re-anchored whenever a finger lands or lifts, so the view never jumps.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  panBy,
  pinchView,
  wheelZoomFactor,
  zoomAt,
  type ViewPoint,
  type ViewTransform,
} from '../logic/viewTransform';

export type TransformState = ViewTransform;

const ZOOM_BUTTON_STEP = 1.25;
const BOARD_CANVAS_SELECTOR = '#tabletop-board-canvas';

type PointerLike = Pick<PointerEvent, 'clientX' | 'clientY' | 'pointerId'>;

/** View and finger positions when the current gesture was (re-)anchored. */
interface Anchor {
  view: ViewTransform;
  points: ViewPoint[];
}

export function usePanPinch(containerRef?: React.RefObject<HTMLElement | null>) {
  const [transform, setTransformState] = useState<TransformState>({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const viewRef = useRef(transform);
  const pointersRef = useRef(new Map<number, ViewPoint>());
  const anchorRef = useRef<Anchor | null>(null);

  const setTransform = useCallback((next: TransformState) => {
    viewRef.current = next;
    setTransformState(next);
  }, []);

  /** Container px of a client position; the view transform lives in that space. */
  const toContainer = useCallback(
    (clientX: number, clientY: number): ViewPoint => {
      const rect = containerRef?.current?.getBoundingClientRect();
      return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
    },
    [containerRef],
  );

  const reanchor = () => {
    const points = [...pointersRef.current.values()].slice(0, 2);
    anchorRef.current = points.length ? { view: viewRef.current, points } : null;
  };

  const addPointer = (e: PointerLike) => {
    pointersRef.current.set(e.pointerId, toContainer(e.clientX, e.clientY));
    reanchor();
    setIsPanning(true);
  };

  const handleStartPan = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // a primary pointer is the first one down: anything still tracked missed its pointerup
    if (e.isPrimary) pointersRef.current.clear();
    addPointer(e);
  };

  /** A further finger while the view is being moved joins the gesture; true when it did. */
  const startPinch = (e: PointerLike) => {
    const pointers = pointersRef.current;
    if (pointers.size === 0 || pointers.has(e.pointerId)) return false;
    addPointer(e);
    return true;
  };

  /** Moves the view with a tracked finger; true when the move belonged to the view gesture. */
  const moveView = (e: PointerLike) => {
    const pointers = pointersRef.current;
    const anchor = anchorRef.current;
    if (!anchor || !pointers.has(e.pointerId)) return false;
    pointers.set(e.pointerId, toContainer(e.clientX, e.clientY));
    const [a, b] = [...pointers.values()];
    const [startA, startB] = anchor.points;
    if (b && startB) setTransform(pinchView(anchor.view, startA, startB, a, b));
    else setTransform(panBy(anchor.view, startA, a));
    return true;
  };

  /** A finger lifted; true while other fingers keep moving the view. */
  const releasePointer = (e: PointerLike) => {
    const pointers = pointersRef.current;
    if (!pointers.delete(e.pointerId)) return false;
    reanchor();
    if (pointers.size === 0) setIsPanning(false);
    return pointers.size > 0;
  };

  const endPan = useCallback(() => {
    pointersRef.current.clear();
    anchorRef.current = null;
    setIsPanning(false);
  }, []);

  const zoomAround = useCallback(
    (anchor: ViewPoint, factor: number) => {
      setTransform(zoomAt(viewRef.current, anchor, viewRef.current.scale * factor));
      // a wheel step during a pan must not be undone by the next pointer move
      if (anchorRef.current) anchorRef.current = { ...anchorRef.current, view: viewRef.current };
    },
    [setTransform],
  );

  const zoomAtCentre = (factor: number) => {
    const el = containerRef?.current;
    zoomAround({ x: (el?.clientWidth ?? 0) / 2, y: (el?.clientHeight ?? 0) / 2 }, factor);
  };
  const zoomIn = () => zoomAtCentre(ZOOM_BUTTON_STEP);
  const zoomOut = () => zoomAtCentre(1 / ZOOM_BUTTON_STEP);
  const resetZoom = () => setTransform({ x: 0, y: 0, scale: 1 });

  // Wheel and trackpad pinch zoom at the cursor. Native listener: React's onWheel is passive,
  // and without preventDefault a trackpad pinch zooms the whole page instead.
  useEffect(() => {
    const el = containerRef?.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const target = e.target as Element | null;
      if (target !== el && !target?.closest(BOARD_CANVAS_SELECTOR)) return; // menus, hand dock
      e.preventDefault();
      zoomAround(
        toContainer(e.clientX, e.clientY),
        wheelZoomFactor(e.deltaY, e.deltaMode, e.ctrlKey),
      );
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [containerRef, toContainer, zoomAround]);

  return {
    transform,
    setTransform,
    isPanning,
    handleStartPan,
    startPinch,
    moveView,
    releasePointer,
    endPan,
    zoomIn,
    zoomOut,
    resetZoom,
  };
}
