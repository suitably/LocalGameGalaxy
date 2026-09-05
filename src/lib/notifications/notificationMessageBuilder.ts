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
    (typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : '');
  let url = `${origin}#/games/${params.gameType}?gameId=${encodeURIComponent(params.gameId)}`;
  if (params.playerId) {
    url += `&player=${encodeURIComponent(params.playerId)}`;
  }
  if (params.relayUrl) {
    url += `&gameRelay=${encodeURIComponent(params.relayUrl)}`;
  }
  return url;
}

export function buildTurnNotificationMessage(params: TurnNotificationParams): NotificationMessagePayload {
  const { gameType, gameId, actionType, actorName, targetPlayerId, relayUrl, origin } = params;

  // Resolve default display name for game
  const defaultGameName =
    params.gameName ||
    (gameType === 'guessart'
      ? (i18n.t('guessart.title', 'GuessArt') as string)
      : gameType === 'storyteller'
      ? (i18n.t('storyteller.title', 'Geschichtenschreiber') as string)
      : 'LocalGameGalaxy');

  let title = '';
  let body = '';

  if (actionType === 'draw') {
    title = i18n.t('notifications.turnTitleDraw', {
      gameName: defaultGameName,
      defaultValue: `${defaultGameName}: Du bist am Zeichnen!`,
    }) as string;

    if (actorName) {
      body = i18n.t('notifications.turnBodyDrawWithActor', {
        actor: actorName,
        defaultValue: `${actorName} hat das Wort erraten! Du bist jetzt am Zeichnen.`,
      }) as string;
    } else {
      body = i18n.t('notifications.turnBodyDrawGeneric', {
        defaultValue: 'Das Wort wurde erraten! Du bist jetzt am Zeichnen.',
      }) as string;
    }
  } else if (actionType === 'guess') {
    title = i18n.t('notifications.turnTitleGuess', {
      gameName: defaultGameName,
      defaultValue: `${defaultGameName}: Du bist am Raten!`,
    }) as string;

    if (actorName) {
      body = i18n.t('notifications.turnBodyGuessWithActor', {
        actor: actorName,
        defaultValue: `${actorName} hat das Bild fertig gezeichnet. Du bist jetzt dran mit Raten!`,
      }) as string;
    } else {
      body = i18n.t('notifications.turnBodyGuessGeneric', {
        defaultValue: 'Ein neues Bild wartet auf dich! Du bist am Raten.',
      }) as string;
    }
  } else if (actionType === 'turn') {
    title = i18n.t('notifications.turnTitleGeneric', {
      gameName: defaultGameName,
      defaultValue: `${defaultGameName}: Du bist dran!`,
    }) as string;

    if (gameType === 'storyteller') {
      if (actorName) {
        body = i18n.t('notifications.turnBodyStoryWithActor', {
          actor: actorName,
          defaultValue: `${actorName} hat den Abschnitt beendet. Du bist jetzt am Zug!`,
        }) as string;
      } else {
        body = i18n.t('notifications.turnBodyStoryGeneric', {
          defaultValue: 'Die Geschichte geht weiter – schreibe deinen Teil!',
        }) as string;
      }
    } else {
      if (actorName) {
        body = i18n.t('notifications.turnBodyGenericWithActor', {
          actor: actorName,
          defaultValue: `${actorName} hat den Zug beendet. Du bist dran!`,
        }) as string;
      } else {
        body = i18n.t('notifications.turnBodyGeneric', {
          defaultValue: 'Du bist am Zug!',
        }) as string;
      }
    }
  } else if (actionType === 'game_start') {
    title = i18n.t('notifications.turnTitleGameStart', {
      gameName: defaultGameName,
      defaultValue: `${defaultGameName}: Das Spiel beginnt!`,
    }) as string;

    body = i18n.t('notifications.turnBodyGeneric', {
      defaultValue: 'Du bist am Zug!',
    }) as string;
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
