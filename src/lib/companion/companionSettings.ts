/**
 * Companion server (helper) connection settings on this device [ID: LIB-COMPANION-SETTINGS]
 */
import { storage, STORAGE_KEYS } from '../storage';

export const DEFAULT_HELPER_URL = 'http://localhost:3000';

export function getHelperUrl(): string {
  return storage.get(STORAGE_KEYS.HELPER_URL, DEFAULT_HELPER_URL);
}

export function setHelperUrl(url: string): void {
  storage.set(STORAGE_KEYS.HELPER_URL, url);
}

export function getHelperToken(): string {
  return storage.get(STORAGE_KEYS.HELPER_TOKEN, '');
}

export function setHelperToken(token: string): void {
  storage.set(STORAGE_KEYS.HELPER_TOKEN, token);
}

/** On unless explicitly switched off. */
export function isHelperActive(): boolean {
  return storage.get(STORAGE_KEYS.HELPER_ACTIVE) !== 'false';
}

export function setHelperActive(active: boolean): void {
  storage.set(STORAGE_KEYS.HELPER_ACTIVE, active ? 'true' : 'false');
}
