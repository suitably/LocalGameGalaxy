import { useLayoutEffect, useState } from 'react';

/** Tracks the container size (for high-DPI canvas sizing); `height` overrides the measured height. */
export const useContainerSize = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  height: number | undefined,
) => {
  const [dimensions, setDimensions] = useState({ width: 800, height: height ?? 300 });

  useLayoutEffect(() => {
    const updateSize = () => {
      const el = containerRef.current;
      if (el) setDimensions({ width: el.offsetWidth, height: height ?? el.offsetHeight ?? 300 });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef, height]);

  return dimensions;
};
