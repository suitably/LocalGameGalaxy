/**
 * Push notification settings on this device: relay URL, method and ntfy topic [ID: LIB-PUSH-SETTINGS]
 */
import { storage, STORAGE_KEYS } from '../storage';
import type { StoredPushSubscription } from './pushTypes';

export type NotificationMethod = 'auto' | 'webpush' | 'ntfy' | 'both';

export const DEFAULT_NTFY_SERVER_URL = 'https://ntfy.sh';

const trimUrl = (url: string) => url.trim().replace(/\/$/, '');

export function getPushRelayUrl(): string {
  return storage.get(STORAGE_KEYS.PUSH_RELAY_URL, '');
}

export function setPushRelayUrl(url: string): void {
  storage.set(STORAGE_KEYS.PUSH_RELAY_URL, trimUrl(url));
}

export function getNotificationMethod(): NotificationMethod {
  const val = storage.get(STORAGE_KEYS.NOTIFICATION_METHOD, 'auto');
  return val === 'webpush' || val === 'ntfy' || val === 'both' ? val : 'auto';
}

export function setNotificationMethod(method: NotificationMethod): void {
  storage.set(STORAGE_KEYS.NOTIFICATION_METHOD, method);
}

export function getNtfyServerUrl(): string {
  return storage.get(STORAGE_KEYS.NTFY_SERVER_URL, DEFAULT_NTFY_SERVER_URL);
}

export function setNtfyServerUrl(url: string): void {
  storage.set(STORAGE_KEYS.NTFY_SERVER_URL, trimUrl(url) || DEFAULT_NTFY_SERVER_URL);
}

/** Random, hard-to-guess ntfy topic (`lgg-user-<16 hex>`). */
export function generateUserNtfyTopic(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `lgg-user-${hex}`;
  }
  const rand = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  return `lgg-user-${rand.slice(0, 16)}`;
}

/** This device's ntfy topic; created and stored on first use. */
export function getUserNtfyTopic(): string {
  let topic = storage.get(STORAGE_KEYS.NTFY_TOPIC);
  if (!topic) {
    topic = generateUserNtfyTopic();
    storage.set(STORAGE_KEYS.NTFY_TOPIC, topic);
  }
  return topic;
}

export function setUserNtfyTopic(topic: string): void {
  const clean = topic
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 64);
  storage.set(STORAGE_KEYS.NTFY_TOPIC, clean || generateUserNtfyTopic());
}

export function regenerateUserNtfyTopic(): string {
  const topic = generateUserNtfyTopic();
  storage.set(STORAGE_KEYS.NTFY_TOPIC, topic);
  return topic;
}

/** How other devices reach this one for turn notifications (`fallbackRelay`: relay from a join link). */
export function getDeviceChannels(fallbackRelay?: string): {
  ntfyTopic: string;
  relayUrl?: string;
  notificationMethod: NotificationMethod;
  webPush?: StoredPushSubscription;
} {
  return {
    ntfyTopic: getUserNtfyTopic(),
    relayUrl: getPushRelayUrl() || fallbackRelay || undefined,
    notificationMethod: getNotificationMethod(),
    webPush:
      storage.getJson<StoredPushSubscription | null>(STORAGE_KEYS.PUSH_SITE_SUBSCRIPTION, null) ??
      undefined,
  };
}
