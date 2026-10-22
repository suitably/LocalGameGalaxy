/**
 * Who hears about a Storyteller turn [ID: STORYTELLER-TURN-NOTIFY]
 *
 * Applies the shared rule (`lib/notifications/turnDelivery.ts`) to a story: after a turn on
 * this device (push the next writer's device or notify here) and when a turn arrives from
 * another device (notify here if the next writer plays on this device).
 */
import {
  buildTurnNotificationMessage,
  deliveryAfterOwnMove,
  deliveryForIncomingMove,
  type TurnDeliveryInput,
} from '../../../lib/notifications';
import { playerAssignment } from './playerAssignment';
import { storytellerNotificationService } from './notificationService';
import type { StoryEntry, StoryGameRecord } from '../types';

function turnOf(game: StoryGameRecord, entries: StoryEntry[]) {
  const next = game.players[game.currentPlayerIndex];
  const last = entries[entries.length - 1];
  const input: TurnDeliveryInput | null = next
    ? {
        targetIsLocal: playerAssignment.isLocal(game, next.id),
        allPlayersLocal: game.players.every((p) => playerAssignment.isLocal(game, p.id)),
        targetIsActor: last?.authorId === next.id,
        temporaryClaim: false,
        appVisible: typeof document === 'undefined' || document.visibilityState === 'visible',
      }
    : null;
  return { next, author: last?.authorName, input };
}

function showHere(game: StoryGameRecord, nextName: string, nextId: string, author?: string) {
  const msg = buildTurnNotificationMessage({
    gameType: 'storyteller',
    gameName: game.name,
    gameId: game.id,
    actionType: 'turn',
    actorName: author,
    targetPlayerName: nextName,
    targetPlayerId: nextId,
  });
  return storytellerNotificationService.showLocalNotification(msg.title, msg.body, msg.url);
}

/** After this device submitted a turn. */
export async function notifyAfterOwnTurn(
  game: StoryGameRecord,
  entries: StoryEntry[],
): Promise<void> {
  const { next, author, input } = turnOf(game, entries);
  if (!next || !input) return;
  const delivery = deliveryAfterOwnMove(input);
  if (delivery.kind === 'push') {
    await storytellerNotificationService.dispatchTurnPush({
      game,
      nextPlayer: next,
      authorName: author,
    });
  } else if (delivery.kind === 'local') {
    await showHere(game, next.name, next.id, author);
  }
}

/** When a turn from another device arrived. */
export async function notifyIncomingTurn(
  game: StoryGameRecord,
  entries: StoryEntry[],
): Promise<void> {
  const { next, author, input } = turnOf(game, entries);
  if (!next || !input) return;
  if (deliveryForIncomingMove(input).kind === 'local')
    await showHere(game, next.name, next.id, author);
}
