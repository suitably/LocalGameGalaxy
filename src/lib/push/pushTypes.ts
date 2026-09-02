/**
 * pushTypes.ts - Data interfaces for Web Push & Game-Scoped Relays
 */

export interface PushNotificationPayload {
  gameId: string;
  senderPlayerId?: string;
  targetPlayerId?: string;
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
  action?: 'draw' | 'guess' | 'turn' | 'game_start';
}

export interface StoredPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface SubscribePushRequest {
  gameId: string;
  playerId: string;
  subscription: StoredPushSubscription;
}

export interface UnsubscribePushRequest {
  gameId: string;
  playerId: string;
}

export interface NotifyPushRequest {
  gameId: string;
  senderPlayerId?: string;
  targetPlayerId?: string;
  title: string;
  body: string;
  url?: string;
  action?: string;
}

export interface VapidKeyResponse {
  publicKey: string;
}
