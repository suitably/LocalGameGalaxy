/**
 * Fits the logical table into its container, on mount and on window resize [ID: HOOK-TABLETOP-FIT]
 */
import { useCallback, useEffect } from 'react';

export function useFitToScreen(
  containerRef: React.RefObject<HTMLDivElement | null>,
  table: { width: number; height: number },
  setTransform: (t: { x: number; y: number; scale: number }) => void,
  setContainerSize: (size: { width: number; height: number }) => void,
) {
  const { width, height } = table;
  const fitToScreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { clientWidth, clientHeight } = el;
    if (clientWidth <= 0 || clientHeight <= 0) return;
    setContainerSize({ width: clientWidth, height: clientHeight });
    const fitScale = Math.min(clientWidth / width, clientHeight / height) * 0.95;
    setTransform({
      x: Math.round((clientWidth - width * fitScale) / 2),
      y: Math.round((clientHeight - height * fitScale) / 2),
      scale: fitScale,
    });
  }, [containerRef, width, height, setTransform, setContainerSize]);

  useEffect(() => {
    fitToScreen();
    window.addEventListener('resize', fitToScreen);
    return () => window.removeEventListener('resize', fitToScreen);
  }, [fitToScreen]);

  return fitToScreen;
}
