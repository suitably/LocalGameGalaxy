import { useEffect, useRef } from 'react';

/** Calls `forward` with the `detail` of every `eventName` CustomEvent on `window`. */
export function useWindowEventForward(eventName: string, forward: (detail: unknown) => void): void {
  const forwardRef = useRef(forward);
  useEffect(() => {
    forwardRef.current = forward;
  });
  useEffect(() => {
    const handle = (e: Event) => forwardRef.current((e as CustomEvent<unknown>).detail);
    window.addEventListener(eventName, handle);
    return () => window.removeEventListener(eventName, handle);
  }, [eventName]);
}
