import { useCallback, useEffect, useState, type RefObject } from 'react';

type OrientationLock = ScreenOrientation & {
  lock?: (o: string) => Promise<void>;
  unlock?: () => void;
};

/**
 * Fullscreen for the stage, in landscape where the device allows it. Where the
 * Fullscreen API is missing (iPhone), the stage instead covers the page.
 */
export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [native, setNative] = useState(false);
  const [covering, setCovering] = useState(false);

  useEffect(() => {
    const onChange = () => setNative(document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [ref]);

  const enter = useCallback(async () => {
    const el = ref.current;
    if (!el) return;
    if (!el.requestFullscreen) {
      setCovering(true);
      return;
    }
    try {
      await el.requestFullscreen({ navigationUI: 'hide' });
      await (screen.orientation as OrientationLock).lock?.('landscape').catch(() => undefined);
    } catch {
      setCovering(true);
    }
  }, [ref]);

  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    (screen.orientation as OrientationLock).unlock?.();
    setCovering(false);
  }, []);

  return { active: native || covering, covering, enter, exit };
}
