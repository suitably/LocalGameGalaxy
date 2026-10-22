/**
 * Signaling tracker settings on this device [ID: LIB-WEBRTC-SIGNALING-SETTINGS]
 */
import { storage, STORAGE_KEYS } from '../storage';
import { getHelperUrl, isHelperActive } from '../companion/companionSettings';

/** Port of the self-hosted tracker next to the companion server (`signaling/`). */
export const SIGNALING_PORT = 8000;

/**
 * The custom signaling URL, or — while the companion server is active — the tracker on the
 * helper's host (`ws(s)://<host>:8000`). Empty when neither applies.
 */
export function getSignalingUrl(): string {
  const custom = storage.get(STORAGE_KEYS.SIGNALING_URL);
  if (custom) return custom;
  if (!isHelperActive()) return '';
  try {
    const parsed = new URL(
      getHelperUrl() ||
        (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
    );
    const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProto}//${parsed.hostname}:${SIGNALING_PORT}`;
  } catch {
    return `ws://localhost:${SIGNALING_PORT}`;
  }
}

export function setSignalingUrl(url: string): void {
  storage.set(STORAGE_KEYS.SIGNALING_URL, url);
}

const disabledTrackersKey = (gameId: string) => `${gameId}_disabled_tracker_urls`;

export function getDisabledTrackerUrls(gameId = 'melodiq'): string[] {
  return storage.getJson<string[]>(disabledTrackersKey(gameId), []);
}

export function setDisabledTrackerUrls(urls: string[], gameId = 'melodiq'): void {
  storage.setJson(disabledTrackersKey(gameId), urls);
}
