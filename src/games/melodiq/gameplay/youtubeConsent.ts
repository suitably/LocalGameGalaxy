import { storage, STORAGE_KEYS } from '../../../lib/storage';

/**
 * The player's choice about YouTube background videos on this device (#645).
 * `unset` = never asked: the session asks once before the first song with a YouTube background.
 */
export type YouTubeConsent = 'granted' | 'denied' | 'unset';

export const getYouTubeConsent = (): YouTubeConsent => {
  const value = storage.get(STORAGE_KEYS.MELODIQ_YOUTUBE_CONSENT);
  // '1' is the value stored before the denied state existed
  if (value === 'granted' || value === '1') return 'granted';
  if (value === 'denied') return 'denied';
  return 'unset';
};

const listeners = new Set<() => void>();

/** Lets the open session and the settings toggle react to each other's changes. */
export const subscribeYouTubeConsent = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const setYouTubeConsent = (consent: Exclude<YouTubeConsent, 'unset'>) => {
  storage.set(STORAGE_KEYS.MELODIQ_YOUTUBE_CONSENT, consent);
  listeners.forEach((listener) => listener());
};

/** Whether a YouTube background may be loaded on this device. */
export const hasYouTubeConsent = () => getYouTubeConsent() === 'granted';
