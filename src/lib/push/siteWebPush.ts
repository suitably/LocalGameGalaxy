/**
 * Web Push through the site's own sender (the app worker's `/api/push/*`) [ID: LIB-SITE-WEB-PUSH]
 *
 * No push server stores anything: this device keeps its subscription (`PUSH_SITE_SUBSCRIPTION`),
 * it travels with this device's players in the game snapshot (`getDeviceChannels`), and the
 * device that moves sends it to `/api/push/send`. Not available in the native app shell or where
 * the deploy has no VAPID keys (the endpoint then answers 503/404 and nothing is subscribed).
 */
import { Capacitor } from '@capacitor/core';
import { storage, STORAGE_KEYS } from '../storage';
import type { StoredPushSubscription } from './pushTypes';

export type SitePushResult = 'sent' | 'gone' | 'failed';

const listeners = new Set<(sub: StoredPushSubscription) => void>();

/** Called when this device gets a new subscription, so open games can put it on their seats. */
export function onSiteSubscription(listener: (sub: StoredPushSubscription) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSiteSubscription(): StoredPushSubscription | null {
  return storage.getJson<StoredPushSubscription | null>(STORAGE_KEYS.PUSH_SITE_SUBSCRIPTION, null);
}

export function base64UrlToBytes(value: string): Uint8Array {
  const padded = (value + '='.repeat((4 - (value.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const sameKey = (key: ArrayBuffer | null | undefined, target: Uint8Array): boolean => {
  if (!key) return false;
  const bytes = new Uint8Array(key);
  return bytes.length === target.length && bytes.every((b, i) => b === target[i]);
};

/** The registration's subscription for `publicKey`; an old one for another key is replaced. */
export async function subscribeWithKey(
  registration: ServiceWorkerRegistration,
  publicKey: string,
): Promise<PushSubscription> {
  const key = base64UrlToBytes(publicKey);
  const existing = await registration.pushManager.getSubscription();
  if (existing && sameKey(existing.options?.applicationServerKey, key)) return existing;
  await existing?.unsubscribe().catch(() => {});
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key as unknown as ArrayBuffer,
  });
}

/**
 * iOS gives web pages push only when they are added to the home screen (iOS 16.4+), so Safari
 * itself never offers it; the banner then explains how to install instead.
 */
export function needsHomeScreenInstall(): boolean {
  if (typeof navigator === 'undefined' || Capacitor.isNativePlatform()) return false;
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

const supported = (): boolean =>
  typeof window !== 'undefined' &&
  !Capacitor.isNativePlatform() &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

async function sitePublicKey(): Promise<string | null> {
  const res = await fetch('/api/push/vapid-public-key', {
    headers: { Accept: 'application/json' },
  }).catch(() => null);
  if (!res?.ok || !res.headers.get('Content-Type')?.includes('application/json')) return null;
  const data = (await res.json().catch(() => null)) as { publicKey?: string } | null;
  return data?.publicKey || null;
}

/**
 * Makes sure this device can be woken by the site's sender and returns its subscription.
 * Asks for notification permission only with `prompt` (call it from a tap); otherwise it only
 * subscribes when permission was already given.
 */
export async function ensureSiteWebPush({
  prompt = false,
}: { prompt?: boolean } = {}): Promise<StoredPushSubscription | null> {
  if (!supported()) return null;
  let permission = Notification.permission;
  if (permission === 'default' && prompt) permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;
  try {
    const publicKey = await sitePublicKey();
    const registration = publicKey ? await navigator.serviceWorker.getRegistration() : undefined;
    if (!publicKey || !registration) return null;
    const json = (await subscribeWithKey(registration, publicKey)).toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return null;
    const stored: StoredPushSubscription = {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    };
    if (getSiteSubscription()?.endpoint !== stored.endpoint) {
      storage.setJson(STORAGE_KEYS.PUSH_SITE_SUBSCRIPTION, stored);
      listeners.forEach((l) => l(stored));
    }
    return stored;
  } catch (err) {
    console.warn('[siteWebPush] Subscribing failed:', err);
    return null;
  }
}

/** Sends one notification to another device's subscription through the site's sender. */
export async function sendSitePush(
  subscription: StoredPushSubscription,
  payload: { title: string; body: string; url?: string; tag?: string; icon?: string },
): Promise<SitePushResult> {
  try {
    const res = await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, ...payload }),
    });
    if (res.ok) return 'sent';
    return res.status === 410 ? 'gone' : 'failed';
  } catch {
    return 'failed';
  }
}
