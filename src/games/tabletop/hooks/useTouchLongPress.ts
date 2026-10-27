/**
 * Long press on touch as a context-menu fallback: iOS Safari sends no `contextmenu` on a long
 * press, so 500 ms without moving opens the menu there [ID: HOOK-TABLETOP-TOUCH-LONG-PRESS]
 */
import { useCallback, useEffect, useRef } from 'react';

export const LONG_PRESS_MS = 500;
/** Moving the finger further than this (px) is a drag, not a long press. */
export const LONG_PRESS_TOLERANCE = 10;

export const movedTooFar = (
  start: { x: number; y: number },
  now: { x: number; y: number },
  tolerance = LONG_PRESS_TOLERANCE,
): boolean => Math.hypot(now.x - start.x, now.y - start.y) > tolerance;

/**
 * Pointer handlers (capture phase) that call `onLongPress` after a still touch press. A native
 * `contextmenu` (Android, desktop) cancels it, so the menu never opens twice.
 */
export function useTouchLongPress(
  onLongPress: (pos: { clientX: number; clientY: number }) => void,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const callback = useRef(onLongPress);
  useEffect(() => {
    callback.current = onLongPress;
  }, [onLongPress]);

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  }, []);
  useEffect(() => cancel, [cancel]);

  const onPointerDownCapture = useCallback(
    (e: React.PointerEvent) => {
      cancel();
      if (e.pointerType !== 'touch') return;
      const pos = { clientX: e.clientX, clientY: e.clientY };
      start.current = { x: e.clientX, y: e.clientY };
      timer.current = setTimeout(() => {
        timer.current = null;
        start.current = null;
        callback.current(pos);
      }, LONG_PRESS_MS);
    },
    [cancel],
  );

  const onPointerMoveCapture = useCallback(
    (e: React.PointerEvent) => {
      if (start.current && movedTooFar(start.current, { x: e.clientX, y: e.clientY })) cancel();
    },
    [cancel],
  );

  return {
    onPointerDownCapture,
    onPointerMoveCapture,
    onPointerUpCapture: cancel,
    onPointerCancelCapture: cancel,
    onContextMenuCapture: cancel,
  };
}
