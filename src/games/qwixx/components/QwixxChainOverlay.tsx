import React, { useEffect, useState } from 'react';

interface ChainPairDef {
  chainId: string;
  topKey: string;
  bottomKey: string;
}

const CHAIN_PAIRS: ChainPairDef[] = [
  { chainId: 'chain_3', topKey: 'red-6', bottomKey: 'yellow-6' }, // Rot 6 - Gelb 6
  { chainId: 'chain_6', topKey: 'red-11', bottomKey: 'yellow-11' }, // Rot 11 - Gelb 11
  { chainId: 'chain_1', topKey: 'yellow-3', bottomKey: 'green-11' }, // Gelb 3 - Grün 11
  { chainId: 'chain_4', topKey: 'yellow-8', bottomKey: 'green-6' }, // Gelb 8 - Grün 6
  { chainId: 'chain_2', topKey: 'green-9', bottomKey: 'blue-9' }, // Grün 9 - Blau 9
  { chainId: 'chain_5', topKey: 'green-4', bottomKey: 'blue-4' }, // Grün 4 - Blau 4
];

interface LineCoords {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  chainId: string;
}

interface QwixxChainOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const QwixxChainOverlay: React.FC<QwixxChainOverlayProps> = ({ containerRef }) => {
  const [lines, setLines] = useState<LineCoords[]>([]);

  useEffect(() => {
    const updateLines = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const calculated: LineCoords[] = [];

      for (const pair of CHAIN_PAIRS) {
        const topEl = container.querySelector(`[data-chain-cell="${pair.topKey}"]`);
        const bottomEl = container.querySelector(`[data-chain-cell="${pair.bottomKey}"]`);

        if (topEl && bottomEl) {
          const topRect = topEl.getBoundingClientRect();
          const bottomRect = bottomEl.getBoundingClientRect();

          calculated.push({
            x1: topRect.left + topRect.width / 2 - containerRect.left,
            y1: topRect.bottom - containerRect.top,
            x2: bottomRect.left + bottomRect.width / 2 - containerRect.left,
            y2: bottomRect.top - containerRect.top,
            chainId: pair.chainId,
          });
        }
      }

      setLines(calculated);
    };

    updateLines();

    // Recompute on window resize
    window.addEventListener('resize', updateLines);

    // Observe container resize
    const container = containerRef.current;
    let observer: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateLines);
      observer.observe(container);
    }

    const timeout = setTimeout(updateLines, 100);

    return () => {
      window.removeEventListener('resize', updateLines);
      if (observer) observer.disconnect();
      clearTimeout(timeout);
    };
  }, [containerRef]);

  if (lines.length === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
        overflow: 'visible',
      }}
    >
      {lines.map((line) => (
        <line
          key={line.chainId}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="#555555"
          strokeWidth={2.8}
          strokeDasharray="4 3"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
};
