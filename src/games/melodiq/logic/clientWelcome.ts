import { storage, STORAGE_KEYS } from '../../../lib/storage';

/** True until this phone has seen (saved or skipped) the Melodiq welcome page once. */
export const needsClientWelcome = (): boolean =>
  storage.get(STORAGE_KEYS.MELODIQ_CLIENT_WELCOMED) !== '1';

export const markClientWelcomed = (): void => {
  storage.set(STORAGE_KEYS.MELODIQ_CLIENT_WELCOMED, '1');
};
