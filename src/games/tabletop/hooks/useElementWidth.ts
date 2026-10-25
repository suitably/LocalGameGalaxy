/**
 * Content width of an element, kept current with a ResizeObserver [ID: HOOK-TABLETOP-ELEMENT-WIDTH]
 */
import { useEffect, useRef, useState } from 'react';

export function useElementWidth<T extends HTMLElement>(fallback = 320) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth || fallback);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [fallback]);

  return { ref, width };
}
