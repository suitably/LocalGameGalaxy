import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { getYouTubeVideoId } from '../YouTubeBackgroundPlayer';
import {
  getYouTubeConsent,
  setYouTubeConsent,
  subscribeYouTubeConsent,
  type YouTubeConsent,
} from '../youtubeConsent';

/** The device's YouTube consent, re-rendering on every change (dialog, settings toggle). */
export const useYouTubeConsent = (): YouTubeConsent =>
  useSyncExternalStore(subscribeYouTubeConsent, getYouTubeConsent);

/**
 * Asks once per device before a song with a YouTube background starts (#645).
 * `pending` holds playback until the player answers; afterwards the choice lives in the game settings.
 */
export function useYouTubeConsentGate(
  videoSrc: string | null | undefined,
  hideBackgroundVideo: boolean,
) {
  const consent = useYouTubeConsent();
  const hasYouTubeVideo = useMemo(() => !!getYouTubeVideoId(videoSrc || undefined), [videoSrc]);
  const allow = useCallback(() => setYouTubeConsent('granted'), []);
  const deny = useCallback(() => setYouTubeConsent('denied'), []);

  return {
    allowed: consent === 'granted',
    pending: hasYouTubeVideo && !hideBackgroundVideo && consent === 'unset',
    allow,
    deny,
  };
}
