/**
 * Share a result via the Web Share API, falling back to the clipboard [ID: HOOK-SHARE-OR-COPY]
 *
 * `copied` is true for a moment after the clipboard fallback was used.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export const COPIED_FEEDBACK_MS = 2500;

export function useShareOrCopy() {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const share = useCallback(async (title: string, text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text });
        return;
      } catch {
        // Cancelled or unsupported payload: fall back to the clipboard
      }
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  }, []);

  return { copied, share };
}
