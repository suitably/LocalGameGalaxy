import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { getYouTubeVideoId } from '../youtubeApi';
import {
  getYouTubeConsent,
  resolveYouTubeConsentGate,
  setYouTubeConsent,
  subscribeYouTubeConsent,
  type YouTubeConsent,
} from '../youtubeConsent';

/** The device's YouTube consent, re-rendering on every change (dialog, settings toggle). */
export const useYouTubeConsent = (): YouTubeConsent =>
  useSyncExternalStore(subscribeYouTubeConsent, getYouTubeConsent);

/** A passive display (TV, phone) follows the host's answer instead of asking itself. */
export interface PassiveConsentSource {
  isPassive: boolean;
  /** Sent by the host in `GAME_STATE`; until it arrives the device's own choice applies. */
  hostConsent?: YouTubeConsent;
}

/**
 * Asks once per device before a song with a YouTube background starts (#645), on the host only.
 * `pending` holds playback until the player answers; afterwards the choice lives in the game settings.
 */
export function useYouTubeConsentGate(
  videoSrc: string | null | undefined,
  hideBackgroundVideo: boolean,
  passive: PassiveConsentSource = { isPassive: false },
) {
  const localConsent = useYouTubeConsent();
  const hasYouTubeVideo = useMemo(() => !!getYouTubeVideoId(videoSrc || undefined), [videoSrc]);
  const allow = useCallback(() => setYouTubeConsent('granted'), []);
  const deny = useCallback(() => setYouTubeConsent('denied'), []);

  return {
    ...resolveYouTubeConsentGate({
      localConsent,
      hasYouTubeVideo,
      hideBackgroundVideo,
      isPassive: passive.isPassive,
      hostConsent: passive.hostConsent,
    }),
    allow,
    deny,
  };
}
