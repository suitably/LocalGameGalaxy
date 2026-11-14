/**
 * Signaling tracker settings on this device [ID: LIB-WEBRTC-SIGNALING-SETTINGS]
 */
import { storage, STORAGE_KEYS } from '../storage';
import { getHelperUrl, isHelperActive } from '../companion/companionSettings';

/** Port of the self-hosted tracker next to the companion server (`signaling/`). */
export const SIGNALING_PORT = 8000;

/** Fired on `window` when the detected tracker of the companion server changed. */
export const SIGNALING_DETECTED_EVENT = 'signaling_detected_updated';

interface DetectedSignaling {
  helperUrl: string;
  url: string;
}

const isLocalHost = (hostname: string) => hostname === 'localhost' || hostname === '127.0.0.1';

/**
 * WebSocket URL of the tracker built into the companion server: the helper's own origin plus the
 * path the server reports in `/api/info` (`signaling`). Null when the server reports none.
 */
export function builtInSignalingUrl(helperUrl: string, path: unknown): string | null {
  if (typeof path !== 'string' || !path.startsWith('/')) return null;
  try {
    const parsed = new URL(helperUrl);
    const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProto}//${parsed.host}${path}`;
  } catch {
    return null;
  }
}

const getDetectedSignalingUrl = (helperUrl: string): string | null => {
  const detected = storage.getJson<DetectedSignaling | null>(STORAGE_KEYS.SIGNALING_DETECTED, null);
  return detected && detected.helperUrl === helperUrl && typeof detected.url === 'string'
    ? detected.url
    : null;
};

/**
 * Asks the active companion server whether it serves a signaling tracker itself and remembers the
 * answer for `getSignalingUrl`. An unreachable server keeps the last answer. When the remembered
 * URL changed it returns true and fires `SIGNALING_DETECTED_EVENT`.
 */
export async function detectHelperSignaling(fetchFn: typeof fetch = fetch): Promise<boolean> {
  if (!isHelperActive() || storage.get(STORAGE_KEYS.SIGNALING_URL)) return false;
  const helperUrl = getHelperUrl();
  let path: unknown;
  try {
    // A helper on this machine is no use to a hosted page's phones; skip the local-network request.
    if (isLocalHost(new URL(helperUrl).hostname) && !isLocalHost(window.location.hostname)) {
      return false;
    }
    const response = await fetchFn(`${helperUrl.replace(/\/$/, '')}/api/info`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    path = ((await response.json()) as { signaling?: unknown } | null)?.signaling;
  } catch {
    return false;
  }
  const url = builtInSignalingUrl(helperUrl, path);
  if (url === getDetectedSignalingUrl(helperUrl)) return false;
  if (url) storage.setJson(STORAGE_KEYS.SIGNALING_DETECTED, { helperUrl, url });
  else storage.remove(STORAGE_KEYS.SIGNALING_DETECTED);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SIGNALING_DETECTED_EVENT));
  return true;
}

/**
 * The custom signaling URL, or — while the companion server is active — its built-in tracker
 * when detected (`ws(s)://<host>[:port]/signaling`), else the separate tracker on the helper's
 * host (`ws(s)://<host>:8000`). Empty when neither applies.
 */
export function getSignalingUrl(): string {
  const custom = storage.get(STORAGE_KEYS.SIGNALING_URL);
  if (custom) return custom;
  if (!isHelperActive()) return '';
  const detected = getDetectedSignalingUrl(getHelperUrl());
  if (detected) return detected;
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
