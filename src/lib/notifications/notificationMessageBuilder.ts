/**
 * notificationMessageBuilder.ts - Single source of truth for constructing localized turn notification messages
 */

import i18n from '../../i18n';
import type { NotificationMessagePayload, TurnNotificationParams } from './notificationTypes';

export function buildGameDeepLink(params: {
  gameType: string;
  gameId: string;
  playerId?: string;
  relayUrl?: string;
  origin?: string;
}): string {
  const origin =
    params.origin ??
    (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '');
  let url = `${origin}#/games/${params.gameType}?gameId=${encodeURIComponent(params.gameId)}`;
  if (params.playerId) {
    url += `&player=${encodeURIComponent(params.playerId)}`;
  }
  if (params.relayUrl) {
    url += `&gameRelay=${encodeURIComponent(params.relayUrl)}`;
  }
  return url;
}

export function buildTurnNotificationMessage(
  params: TurnNotificationParams,
): NotificationMessagePayload {
  const { gameType, gameId, actionType, actorName, targetPlayerId, relayUrl, origin } = params;

  // Resolve default display name for game
  const defaultGameName =
    params.gameName ||
    (gameType === 'guessart'
      ? (i18n.t('guessart.title') as string)
      : gameType === 'storyteller'
        ? (i18n.t('storyteller.title') as string)
        : 'LocalGameGalaxy');

  let title = '';
  let body = '';

  if (actionType === 'draw') {
    title = i18n.t('notifications.turnTitleDraw', {
      gameName: defaultGameName,
    }) as string;

    if (actorName) {
      body = i18n.t('notifications.turnBodyDrawWithActor', {
        actor: actorName,
      }) as string;
    } else {
      body = i18n.t('notifications.turnBodyDrawGeneric') as string;
    }
  } else if (actionType === 'guess') {
    title = i18n.t('notifications.turnTitleGuess', {
      gameName: defaultGameName,
    }) as string;

    if (actorName) {
      body = i18n.t('notifications.turnBodyGuessWithActor', {
        actor: actorName,
      }) as string;
    } else {
      body = i18n.t('notifications.turnBodyGuessGeneric') as string;
    }
  } else if (actionType === 'turn') {
    title = i18n.t('notifications.turnTitleGeneric', {
      gameName: defaultGameName,
    }) as string;

    if (gameType === 'storyteller') {
      if (actorName) {
        body = i18n.t('notifications.turnBodyStoryWithActor', {
          actor: actorName,
        }) as string;
      } else {
        body = i18n.t('notifications.turnBodyStoryGeneric') as string;
      }
    } else {
      if (actorName) {
        body = i18n.t('notifications.turnBodyGenericWithActor', {
          actor: actorName,
        }) as string;
      } else {
        body = i18n.t('notifications.turnBodyGeneric') as string;
      }
    }
  } else if (actionType === 'game_start') {
    title = i18n.t('notifications.turnTitleGameStart', {
      gameName: defaultGameName,
    }) as string;

    body = i18n.t('notifications.turnBodyGeneric') as string;
  }

  const url = buildGameDeepLink({
    gameType,
    gameId,
    playerId: targetPlayerId,
    relayUrl,
    origin,
  });

  return {
    title,
    body,
    tag: `${gameType}-${gameId}`,
    icon: '/pwa/icon_full.png',
    url,
    action: actionType,
  };
}
