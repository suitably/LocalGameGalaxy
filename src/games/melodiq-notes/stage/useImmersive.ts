import { useCallback, useEffect, useState } from 'react';
import { useMediaQuery } from '@mui/material';
import { useHeaderLayout } from '../../../context/HeaderLayoutContext';

type OrientationLock = ScreenOrientation & {
  lock?: (o: string) => Promise<void>;
  unlock?: () => void;
};

/** A phone on its side: the app header would leave the stage too little height. */
const SHORT_LANDSCAPE = '(orientation: landscape) and (max-height: 500px)';

/**
 * Immersive view: the app header is hidden and the stage frame (top bar, stage, controls) gets
 * the whole screen. On request the page also goes into native full screen, in landscape where
 * the device allows it; without the Fullscreen API (iPhone) only the header goes. Phones in
 * landscape are immersive by themselves, like a video player.
 */
export function useImmersive() {
  const { setHeaderHidden } = useHeaderLayout();
  const shortLandscape = useMediaQuery(SHORT_LANDSCAPE);
  const [requested, setRequested] = useState(false);

  // leaving native full screen in the browser (Esc, back gesture) ends the request too
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setRequested(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const active = requested || shortLandscape;
  useEffect(() => {
    setHeaderHidden(active);
    return () => setHeaderHidden(false);
  }, [active, setHeaderHidden]);

  const enter = useCallback(async () => {
    setRequested(true);
    const page = document.documentElement;
    if (!page.requestFullscreen) return;
    try {
      await page.requestFullscreen({ navigationUI: 'hide' });
      await (screen.orientation as OrientationLock).lock?.('landscape').catch(() => undefined);
    } catch {
      // refused (no gesture, iframe): the header stays hidden all the same
    }
  }, []);

  const exit = useCallback(() => {
    setRequested(false);
    if (document.fullscreenElement) void document.exitFullscreen();
    (screen.orientation as OrientationLock).unlock?.();
  }, []);

  return { active, requested, enter, exit };
}

export type Immersive = ReturnType<typeof useImmersive>;
