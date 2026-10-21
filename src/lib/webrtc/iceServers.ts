import { storage, STORAGE_KEYS } from '../storage';

export interface StunServerItem {
  url: string;
  type: 'default' | 'custom';
  enabled: boolean;
}

interface DefaultStunServer {
  url: string;
  enabledByDefault: boolean;
}

/**
 * Built-in STUN servers. Google's server stays selectable but is off unless the user enables it.
 * STUN is resolved per device: host and phones may use different servers.
 */
export const DEFAULT_STUN_SERVERS: readonly DefaultStunServer[] = [
  { url: 'stun:stun.cloudflare.com:3478', enabledByDefault: true },
  { url: 'stun:global.stun.twilio.com:3478', enabledByDefault: true },
  { url: 'stun:stun.l.google.com:19302', enabledByDefault: false },
];

export interface StunSettings {
  customUrls: string[];
  preferences: Record<string, boolean>;
}

/** Accepts `stun:host[:port]` and `stuns:host[:port]` (RFC 7064). */
export function isValidStunUrl(url: string): boolean {
  return /^stuns?:[^\s/?#]+$/i.test(url.trim());
}

/**
 * Builds the selectable STUN list: built-in servers first, then custom ones.
 * An explicit preference wins over the built-in default; custom servers are enabled by default.
 */
export function buildStunServers(
  { customUrls, preferences }: StunSettings,
  defaults: readonly DefaultStunServer[] = DEFAULT_STUN_SERVERS,
): StunServerItem[] {
  const items: StunServerItem[] = defaults.map(({ url, enabledByDefault }) => ({
    url,
    type: 'default',
    enabled: preferences[url] ?? enabledByDefault,
  }));

  for (const url of customUrls) {
    if (items.some((item) => item.url === url)) continue;
    items.push({ url, type: 'custom', enabled: preferences[url] ?? true });
  }

  return items;
}

/** Maps enabled STUN servers to the `iceServers` shape expected by RTCPeerConnection. */
export function toIceServers(items: StunServerItem[]): RTCIceServer[] {
  return items.filter((item) => item.enabled).map((item) => ({ urls: item.url }));
}

export function loadStunSettings(): StunSettings {
  const customUrls = storage.getJson<unknown>(STORAGE_KEYS.WEBRTC_STUN_CUSTOM_URLS, []);
  const preferences = storage.getJson<unknown>(STORAGE_KEYS.WEBRTC_STUN_PREFERENCES, {});

  return {
    customUrls: Array.isArray(customUrls)
      ? customUrls.filter((url): url is string => typeof url === 'string' && isValidStunUrl(url))
      : [],
    preferences:
      preferences && typeof preferences === 'object' && !Array.isArray(preferences)
        ? Object.fromEntries(
            Object.entries(preferences).filter(
              (entry): entry is [string, boolean] => typeof entry[1] === 'boolean',
            ),
          )
        : {},
  };
}

export function saveStunSettings(settings: StunSettings): void {
  storage.setJson(STORAGE_KEYS.WEBRTC_STUN_CUSTOM_URLS, settings.customUrls);
  storage.setJson(STORAGE_KEYS.WEBRTC_STUN_PREFERENCES, settings.preferences);
}

/** ICE servers for a new peer connection, read from this device's STUN settings. */
export function getIceServers(): RTCIceServer[] {
  return toIceServers(buildStunServers(loadStunSettings()));
}

export type AddStunResult = 'added' | 'invalid' | 'duplicate';

/** Settings with a custom STUN URL added (enabled), or why it was rejected. */
export function addCustomStunUrl(
  settings: StunSettings,
  url: string,
): { result: AddStunResult; settings: StunSettings } {
  const trimmed = url.trim();
  if (!isValidStunUrl(trimmed)) return { result: 'invalid', settings };
  if (buildStunServers(settings).some((s) => s.url === trimmed)) {
    return { result: 'duplicate', settings };
  }
  return {
    result: 'added',
    settings: {
      customUrls: [...settings.customUrls, trimmed],
      preferences: { ...settings.preferences, [trimmed]: true },
    },
  };
}

/** Settings without the custom STUN URL and its preference. */
export function removeCustomStunUrl(settings: StunSettings, url: string): StunSettings {
  return {
    customUrls: settings.customUrls.filter((u) => u !== url),
    preferences: Object.fromEntries(
      Object.entries(settings.preferences).filter(([key]) => key !== url),
    ),
  };
}
