import { useEffect, useRef, useState } from 'react';
import { fitFactor } from '../logic/lyricsFit';

/**
 * Shrinks a single-line lyric to its container: attach `containerRef` to the full-width box and
 * `contentRef` to the `max-content` text, then multiply the font size by `fit`.
 * Re-measures whenever either element resizes (new line, window or TV resolution change).
 */
export function useFitToWidth<C extends HTMLElement, T extends HTMLElement>() {
  const containerRef = useRef<C>(null);
  const contentRef = useRef<T>(null);
  const fitRef = useRef(1);
  const [fit, setFit] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      const next = fitFactor(container.clientWidth, content.scrollWidth, fitRef.current);
      if (Math.abs(next - fitRef.current) < 0.005) return;
      fitRef.current = next;
      setFit(next);
    });
    observer.observe(container);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return { containerRef, contentRef, fit };
}
