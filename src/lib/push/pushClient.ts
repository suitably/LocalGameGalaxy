/**
 * pushClient.ts - Browser Web Push Manager & Relay Dispatcher
 *
 * Handles Web Push subscription registration via ServiceWorker and sends
 * push trigger requests to the game's configured relay (Cloudflare Worker or self-hosted server).
 */

import { gameRelayStorage } from './gameRelayStorage';
import type { PushNotificationPayload, StoredPushSubscription } from './pushTypes';

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

export const pushClient = {
  /**
   * Checks if the current browser environment supports the Web Push API.
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
   * Registers this device's PushSubscription with the game's relay.
   */
  async registerForGamePush(gameId: string, playerId: string): Promise<boolean> {
    if (!this.isPushSupported() || !gameId || !playerId) {
      return false;
    }

    const relayUrl = gameRelayStorage.getGameRelay(gameId);
    if (!relayUrl) {
      return false;
    }

    try {
      // 1. Ensure notification permission
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          return false;
        }
      }

      // 2. Fetch VAPID public key from relay
      const vapidKeyUrl = relayUrl.includes('/api/push')
        ? `${relayUrl}/vapid-public-key`
        : `${relayUrl}/api/push/vapid-public-key`;

      const keyRes = await fetch(vapidKeyUrl, {
        headers: { Accept: 'application/json' },
      }).catch(() => null);

      if (!keyRes || !keyRes.ok) {
        return false;
      }

      const keyData = await keyRes.json();
      const publicKey = keyData.publicKey;
      if (!publicKey) return false;

      // 3. Get ServiceWorker registration and subscribe
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Verify that the existing subscription matches the relay's current VAPID key
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
          console.log('[PushClient] VAPID key changed, renewing push subscription for relay...');
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

      // 4. Send subscription to relay for this game & player
      const subscribeUrl = relayUrl.includes('/api/push')
        ? `${relayUrl}/subscribe`
        : `${relayUrl}/api/push/subscribe`;

      const subRes = await fetch(subscribeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          playerId,
          subscription: storedSubscription,
        }),
      });

      if (subRes.ok) {
        console.log(`[PushClient] Player ${playerId} registered for push on game ${gameId} via ${relayUrl}`);
      } else {
        console.warn(`[PushClient] Relay rejected subscription (${subRes.status}):`, await subRes.text().catch(() => ''));
      }

      return subRes.ok;
    } catch (err) {
      console.warn('[PushClient] Failed to register push subscription:', err);
      return false;
    }
  },

  /**
   * Dispatches a push notification request to the game's relay to wake up other players.
   */
  async sendGamePushNotification(payload: PushNotificationPayload): Promise<boolean> {
    const relayUrl = gameRelayStorage.getGameRelay(payload.gameId);
    if (!relayUrl) {
      console.warn('[PushClient] Cannot send push notification: no relay configured for game', payload.gameId);
      return false;
    }

    try {
      const notifyUrl = relayUrl.includes('/api/push')
        ? `${relayUrl}/notify`
        : `${relayUrl}/api/push/notify`;

      const res = await fetch(notifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        console.log('[PushClient] Push notification dispatched via relay:', data);
        return true;
      } else {
        console.warn(`[PushClient] Relay notify returned status ${res.status}:`, await res.text().catch(() => ''));
        return false;
      }
    } catch (err) {
      console.warn('[PushClient] Failed to send push notification via relay:', err);
      return false;
    }
  },
};
