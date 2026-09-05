/**
 * notificationTypes.ts - Types for unified notification formatting and presentation
 */

export type TurnActionType = 'draw' | 'guess' | 'turn' | 'game_start';

export interface TurnNotificationParams {
  gameType: 'guessart' | 'storyteller' | string;
  gameName?: string;
  gameId: string;
  actionType: TurnActionType;
  actorName?: string;
  targetPlayerName?: string;
  targetPlayerId?: string;
  relayUrl?: string;
  origin?: string;
}

export interface NotificationMessagePayload {
  title: string;
  body: string;
  tag: string;
  icon: string;
  url: string;
  action: TurnActionType;
}

export interface ShowNotificationOptions {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: unknown;
}
