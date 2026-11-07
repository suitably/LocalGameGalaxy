import { storage, STORAGE_KEYS } from '../../../lib/storage';

/** Whether the player allowed YouTube background videos on this device (#645). */
export const hasYouTubeConsent = () => storage.get(STORAGE_KEYS.MELODIQ_YOUTUBE_CONSENT) === '1';

export const grantYouTubeConsent = () => storage.set(STORAGE_KEYS.MELODIQ_YOUTUBE_CONSENT, '1');
