/**
 * Fits the table into its container, on mount and on window resize [ID: HOOK-TABLETOP-FIT]
 *
 * Zooms in on the pieces when they cover only a small part of the table (`logic/fitView.ts`).
 */
import { useCallback, useEffect, useRef } from 'react';
import { contentBounds, fitView } from '../logic/fitView';
import type { TabletopWidget } from '../logic/types';

export function useFitToScreen(
  containerRef: React.RefObject<HTMLDivElement | null>,
  game: { table: { width: number; height: number }; widgets: Record<string, TabletopWidget> },
  setTransform: (t: { x: number; y: number; scale: number }) => void,
  setContainerSize: (size: { width: number; height: number }) => void,
) {
  const { width, height } = game.table;
  const { widgets } = game;
  // Read at fit time only: moving a piece must not re-fit the view.
  const widgetsRef = useRef(widgets);
  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  const fitToScreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { clientWidth, clientHeight } = el;
    if (clientWidth <= 0 || clientHeight <= 0) return;
    setContainerSize({ width: clientWidth, height: clientHeight });
    const size = { width, height };
    setTransform(
      fitView(
        { width: clientWidth, height: clientHeight },
        size,
        contentBounds(widgetsRef.current, size),
      ),
    );
  }, [containerRef, width, height, setTransform, setContainerSize]);

  useEffect(() => {
    fitToScreen();
    window.addEventListener('resize', fitToScreen);
    return () => window.removeEventListener('resize', fitToScreen);
  }, [fitToScreen]);

  return fitToScreen;
}
