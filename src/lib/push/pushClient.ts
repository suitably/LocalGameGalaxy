/**
 * pushClient.ts - Hybrid Web Push & ntfy Client
 *
 * Handles Web Push subscription registration via ServiceWorker as well as
 * deGoogled ntfy topic subscription and hybrid dispatch via Cloudflare Worker relay.
 */

import { gameRelayStorage } from './gameRelayStorage';
import { storage } from '../storage';
import type { NotificationMethod, PushNotificationPayload, StoredPushSubscription } from './pushTypes';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function sanitizeTopicPart(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
}

export const pushClient = {
  /**
   * Checks if the current browser environment supports the standard Web Push API.
   */
  isPushSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  },

  /**
   * Generates a deterministic ntfy topic name for a game and optional target player,
   * or returns the user's personal ntfy topic if neither is provided.
   */
  getNtfyTopic(gameId?: string, playerId?: string): string {
    if (!gameId && !playerId) {
      return storage.getUserNtfyTopic();
    }
    const cleanG = sanitizeTopicPart(gameId || 'game');
    const cleanP = playerId ? `-${sanitizeTopicPart(playerId)}` : '';
    return `lgg-${cleanG}${cleanP}`;
  },

  /**
   * Returns the user's personal ntfy topic for this device.
   */
  getUserNtfyTopic(): string {
    return storage.getUserNtfyTopic();
  },

  /**
   * Generates the web URL to subscribe/view a game or personal topic on an ntfy instance.
   */
  getNtfyUrl(topicOrGameId?: string, playerId?: string, customServer?: string): string {
    const server = (customServer || storage.getNtfyServerUrl()).replace(/\/$/, '');
    if (!topicOrGameId) {
      return `${server}/${storage.getUserNtfyTopic()}`;
    }
    if (topicOrGameId.startsWith('lgg-user-')) {
      return `${server}/${sanitizeTopicPart(topicOrGameId)}`;
    }
    return `${server}/${this.getNtfyTopic(topicOrGameId, playerId)}`;
  },

  /**
   * Generates the web URL for the user's personal ntfy topic on this device.
   */
  getUserNtfyUrl(customServer?: string): string {
    const server = (customServer || storage.getNtfyServerUrl()).replace(/\/$/, '');
    return `${server}/${storage.getUserNtfyTopic()}`;
  },

  /**
   * Generates the app intent URI for opening the ntfy Android app directly.
   */
  getNtfyAppScheme(topicOrGameId?: string, playerId?: string, customServer?: string): string {
    const server = (customServer || storage.getNtfyServerUrl()).replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!topicOrGameId) {
      return `ntfy://${server}/${storage.getUserNtfyTopic()}`;
    }
    if (topicOrGameId.startsWith('lgg-user-')) {
      return `ntfy://${server}/${sanitizeTopicPart(topicOrGameId)}`;
    }
    return `ntfy://${server}/${this.getNtfyTopic(topicOrGameId, playerId)}`;
  },

  /**
   * Generates the app intent URI for opening the personal topic directly in the ntfy Android app.
   */
  getUserNtfyAppScheme(customServer?: string): string {
    const server = (customServer || storage.getNtfyServerUrl()).replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `ntfy://${server}/${storage.getUserNtfyTopic()}`;
  },

  /**
   * Sends a notification directly to the configured ntfy server via HTTP POST (CORS-friendly).
   */
  async sendDirectNtfyNotification(payload: PushNotificationPayload): Promise<boolean> {
    const server = storage.getNtfyServerUrl().replace(/\/$/, '');
    const topic =
      payload.ntfyTopic ||
      (payload.gameId && payload.targetPlayerId
        ? this.getNtfyTopic(payload.gameId, payload.targetPlayerId)
        : storage.getUserNtfyTopic());

    try {
      const res = await fetch(`${server}/${topic}`, {
        method: 'POST',
        headers: {
          Title: payload.title,
          Click: payload.url || (typeof window !== 'undefined' ? window.location.href : '/'),
          Priority: 'high',
          Tags: 'game_die,tada',
        },
        body: payload.body,
      });
      console.log(`[PushClient] Direct ntfy dispatched to ${server}/${topic}: ${res.ok ? 'OK' : res.status}`);
      return res.ok;
    } catch (err) {
      console.warn('[PushClient] Direct ntfy dispatch failed:', err);
      return false;
    }
  },

  /**
   * Registers this device's PushSubscription or ntfy topic with the game's relay.
   */
  async registerForGamePush(gameId: string, playerId: string, preferredRelayUrl?: string): Promise<boolean> {
    if (!gameId || !playerId) return false;

    const relayUrl = preferredRelayUrl || gameRelayStorage.getGameRelay(gameId);
    const prefMethod: NotificationMethod = storage.getNotificationMethod();
    const ntfyTopic = storage.getUserNtfyTopic();

    if (!relayUrl) {
      return false;
    }

    // If preferred method is ntfy-only, register ntfy directly without prompting VAPID
    if (prefMethod === 'ntfy') {
      return await this.sendSubscribeToRelay(relayUrl, gameId, playerId, {
        method: 'ntfy',
        ntfyTopic,
      });
    }

    // Otherwise register Web Push (with ntfy as fallback/hybrid)
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      await this.sendSubscribeToRelay(relayUrl, gameId, playerId, { method: 'ntfy', ntfyTopic });
      return false;
    }

    try {
      const vapidKeyUrl = relayUrl.includes('/api/push')
        ? `${relayUrl}/vapid-public-key`
        : `${relayUrl}/api/push/vapid-public-key`;

      const keyRes = await fetch(vapidKeyUrl, {
        headers: { Accept: 'application/json' },
      }).catch(() => null);

      if (!keyRes || !keyRes.ok) {
        await this.sendSubscribeToRelay(relayUrl, gameId, playerId, { method: 'ntfy', ntfyTopic });
        return false;
      }

      const keyData = await keyRes.json();
      const publicKey = keyData.publicKey;
      if (!publicKey) return false;

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const rawKey = subscription.options?.applicationServerKey;
        const targetBytes = urlBase64ToUint8Array(publicKey);
        let match = false;
        if (rawKey) {
          const rawBytes = new Uint8Array(rawKey);
          if (rawBytes.length === targetBytes.length) {
            match = rawBytes.every((val, idx) => val === targetBytes[idx]);
          }
        }
        if (!match) {
          await subscription.unsubscribe().catch(() => {});
          subscription = null;
        }
      }

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as ArrayBuffer,
        });
      }

      if (!subscription) return false;

      const subJson = subscription.toJSON();
      if (!subJson.endpoint || !subJson.keys) return false;

      const storedSubscription: StoredPushSubscription = {
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys.p256dh || '',
          auth: subJson.keys.auth || '',
        },
      };

      const method: NotificationMethod = prefMethod === 'both' ? 'both' : 'webpush';
      return await this.sendSubscribeToRelay(relayUrl, gameId, playerId, {
        method,
        subscription: storedSubscription,
        ntfyTopic,
      });
    } catch (err) {
      console.warn('[PushClient] Web Push subscription failed, falling back to ntfy registration:', err);
      if (relayUrl) {
        await this.sendSubscribeToRelay(relayUrl, gameId, playerId, { method: 'ntfy', ntfyTopic });
      }
      return false;
    }
  },

  async sendSubscribeToRelay(
    relayUrl: string,
    gameId: string,
    playerId: string,
    data: {
      method?: NotificationMethod;
      subscription?: StoredPushSubscription;
      ntfyTopic?: string;
    },
  ): Promise<boolean> {
    try {
      const subscribeUrl = relayUrl.includes('/api/push')
        ? `${relayUrl}/subscribe`
        : `${relayUrl}/api/push/subscribe`;

      const subRes = await fetch(subscribeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, playerId, ...data }),
      });
      return subRes.ok;
    } catch {
      return false;
    }
  },

  async unsubscribeFromGamePush(gameId: string, playerId: string, customRelayUrl?: string): Promise<boolean> {
    if (!gameId || !playerId) return false;
    const relayUrl = customRelayUrl || gameRelayStorage.getGameRelay(gameId);
    if (!relayUrl) return false;
    try {
      const url = relayUrl.includes('/api/push')
        ? `${relayUrl}/unsubscribe`
        : `${relayUrl}/api/push/unsubscribe`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, playerId }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Dispatches a push notification request to the game's relay and falls back to direct ntfy if needed.
   */
  async sendGamePushNotification(payload: PushNotificationPayload): Promise<boolean> {
    // Never dispatch a turn notification if sender and target are the same player
    if (payload.senderPlayerId && payload.targetPlayerId && payload.senderPlayerId === payload.targetPlayerId) {
      console.log('[PushClient] Suppressing push notification to self (senderPlayerId === targetPlayerId)');
      return false;
    }

    // Never dispatch if target ntfyTopic matches this device's own personal topic!
    const ownUserTopic = storage.getUserNtfyTopic();
    if (payload.ntfyTopic && ownUserTopic && payload.ntfyTopic === ownUserTopic) {
      console.log('[PushClient] Suppressing push notification to self (target ntfyTopic === own user topic)');
      return false;
    }

    const relayUrl = payload.targetRelayUrl || gameRelayStorage.getGameRelay(payload.gameId);
    const ntfyTopic =
      payload.ntfyTopic ||
      (payload.gameId && payload.targetPlayerId
        ? this.getNtfyTopic(payload.gameId, payload.targetPlayerId)
        : undefined);

    if (!relayUrl && !ntfyTopic) {
      console.warn('[PushClient] No target relay or ntfy topic available for push notification; skipping.');
      return false;
    }

    const enrichedPayload: PushNotificationPayload = { ...payload, ntfyTopic };

    let relaySuccess = false;
    if (relayUrl) {
      try {
        const notifyUrl = relayUrl.includes('/api/push')
          ? `${relayUrl}/notify`
          : `${relayUrl}/api/push/notify`;

        const res = await fetch(notifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(enrichedPayload),
        });

        if (res.ok) {
          const data = await res.json().catch(() => null);
          console.log('[PushClient] Push notification dispatched via relay:', data);
          relaySuccess = true;
        } else {
          console.warn(`[PushClient] Relay notify failed with status ${res.status}`);
        }
      } catch (err) {
        console.warn('[PushClient] Failed to send push via relay:', err);
      }
    }

    // Direct ntfy dispatch:
    // If ntfyTopic is available (e.g. personal lgg-user-xxx topic), ALWAYS dispatch directly via ntfy POST.
    // This ensures reliable delivery to the recipient's ntfy app/device even if browser Web Push is inactive or offline.
    let ntfySuccess = false;
    if (ntfyTopic) {
      ntfySuccess = await this.sendDirectNtfyNotification(enrichedPayload);
    }

    return relaySuccess || ntfySuccess;
  },
};
