import { storage, STORAGE_KEYS } from '../../../lib/storage';
import { generateUUID } from '../../../lib/uuid';

export interface ClientProfile {
  name: string;
  hue: number;
  micDeviceId?: string;
  displayMode?: 'lyrics' | 'self' | 'all';
  latency?: number;
  deviceId: string;
}

export const DEFAULT_TRACKER_URLS = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.webtorrent.dev',
];

/** Tracker URLs: `?tracker=` query params win, then stored settings, then the public defaults. */
export const resolveTrackerUrls = (search: string): string[] => {
  const fromUrl = new URLSearchParams(search).getAll('tracker');
  if (fromUrl.length > 0) return fromUrl;
  const stored = storage.getJson<string[]>(STORAGE_KEYS.MELODIQ_TRACKER_URLS, []);
  if (Array.isArray(stored) && stored.length > 0) return stored;
  return DEFAULT_TRACKER_URLS;
};

/** Stored phone profile (completed with defaults) or a fresh random one, persisted on creation. */
export const loadClientProfile = (): ClientProfile => {
  const parsed = storage.getJson<ClientProfile | null>(STORAGE_KEYS.CLIENT_PROFILE, null);
  if (parsed) {
    if (!parsed.displayMode) parsed.displayMode = 'lyrics';
    if (!parsed.deviceId) {
      parsed.deviceId = generateUUID();
      storage.setJson(STORAGE_KEYS.CLIENT_PROFILE, parsed);
    }
    return parsed;
  }
  const fresh: ClientProfile = {
    name: 'Phone',
    hue: Math.floor(Math.random() * 360),
    displayMode: 'lyrics',
    deviceId: generateUUID(),
  };
  storage.setJson(STORAGE_KEYS.CLIENT_PROFILE, fresh);
  return fresh;
};
