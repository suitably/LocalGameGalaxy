/**
 * pushTypes.ts - Data interfaces for Web Push, ntfy & Game-Scoped Relays
 */

export type NotificationMethod = 'auto' | 'webpush' | 'ntfy' | 'both';

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
  ntfyTopic?: string;
  targetRelayUrl?: string;
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
  subscription?: StoredPushSubscription;
  method?: NotificationMethod;
  ntfyTopic?: string;
}

export interface UnsubscribePushRequest {
  gameId: string;
  playerId: string;
}

export interface NotifyPushRequest {
  gameId: string;
  senderPlayerId?: string;
  targetPlayerId?: string;
  targetRelayUrl?: string;
  title: string;
  body: string;
  url?: string;
  action?: string;
  ntfyTopic?: string;
}

export interface VapidKeyResponse {
  publicKey: string;
}

export interface RelayNotifyResponse {
  success: boolean;
  webPushSent?: number;
  webPushFailed?: number;
  ntfySent?: number;
  ntfyFailed?: number;
  totalTargets?: number;
  details?: unknown[];
  error?: string;
}
