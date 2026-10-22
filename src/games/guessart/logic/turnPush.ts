/**
 * Tells the next player about their turn after a move on this device [ID: GUESSART-TURN-PUSH]
 *
 * The decision (push to the other device, notify here, or nothing) is `deliveryAfterOwnMove`;
 * this file only resolves the players and sends.
 */
import { gameRelayStorage } from '../../../lib/push/gameRelayStorage';
import { pushClient } from '../../../lib/push/pushClient';
import {
  buildTurnNotificationMessage,
  deliveryAfterOwnMove,
  localNotificationPresenter,
} from '../../../lib/notifications';
import { playerAssignment } from './playerAssignment';
import type { GameSnapshot } from './types';

export interface TurnPushParams {
  snap: GameSnapshot;
  /** Player who just moved. */
  actorId?: string;
  targetPlayerId: string;
  actionType: 'draw' | 'guess';
  /** The move was made with "play here" for a remote player. */
  temporaryClaim: boolean;
}

export async function sendTurnPush({
  snap,
  actorId,
  targetPlayerId,
  actionType,
  temporaryClaim,
}: TurnPushParams): Promise<void> {
  const { game } = snap;
  const target = game.players.find((p) => p.id === targetPlayerId);
  if (!target) return;
  const actor = game.players.find((p) => p.id === actorId);

  const delivery = deliveryAfterOwnMove({
    targetIsLocal: playerAssignment.isLocal(game, target.id),
    allPlayersLocal: game.players.every((p) => playerAssignment.isLocal(game, p.id)),
    targetIsActor: actorId === target.id,
    temporaryClaim,
    appVisible: typeof document === 'undefined' || document.visibilityState === 'visible',
  });
  if (delivery.kind === 'none') return;

  const relayUrl = gameRelayStorage.getEffectiveRelay(game.id, target.relayUrl) || undefined;
  const message = buildTurnNotificationMessage({
    gameType: 'guessart',
    gameName: game.name,
    gameId: game.id,
    actionType,
    actorName: actor?.name,
    targetPlayerName: target.name,
    targetPlayerId: target.id,
    relayUrl,
  });

  if (delivery.kind === 'local') {
    await localNotificationPresenter
      .showNotification({ ...message, data: { url: message.url } })
      .catch(() => {});
    return;
  }

  try {
    await pushClient.sendGamePushNotification({
      gameId: game.id,
      senderPlayerId: actorId,
      targetPlayerId: target.id,
      targetRelayUrl: relayUrl,
      ntfyTopic: target.ntfyTopic,
      title: message.title,
      body: message.body,
      url: message.url,
      tag: message.tag,
      icon: message.icon,
      action: actionType,
    });
  } catch (e) {
    console.warn('[GuessArt] Failed to send turn push notification:', e);
  }
}
