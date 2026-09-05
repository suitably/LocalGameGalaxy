import { pushClient } from '../../../lib/push/pushClient';
import { gameRelayStorage } from '../../../lib/push/gameRelayStorage';
import { buildTurnNotificationMessage, localNotificationPresenter } from '../../../lib/notifications';
import type { StoryGameRecord, StoryPlayer } from '../types';

class StorytellerNotificationService {
  public isSupported(): boolean {
    return localNotificationPresenter.isSupported();
  }

  public hasPermission(): boolean {
    return localNotificationPresenter.hasPermission();
  }

  public async requestPermission(): Promise<boolean> {
    const res = await localNotificationPresenter.requestPermission();
    return res === 'granted';
  }

  public async showLocalNotification(title: string, body: string, url?: string): Promise<void> {
    await localNotificationPresenter.showNotification({
      title,
      body,
      url,
      tag: 'storyteller-turn',
    });
  }

  public async dispatchTurnPush(params: {
    game: StoryGameRecord;
    nextPlayer: StoryPlayer;
    authorName?: string;
  }): Promise<boolean> {
    const { game, nextPlayer, authorName } = params;
    const effectiveRelay = gameRelayStorage.getEffectiveRelay(game.id, nextPlayer.relayUrl);

    const message = buildTurnNotificationMessage({
      gameType: 'storyteller',
      gameName: game.name,
      gameId: game.id,
      actionType: 'turn',
      actorName: authorName,
      targetPlayerName: nextPlayer.name,
      targetPlayerId: nextPlayer.id,
      relayUrl: effectiveRelay || undefined,
    });

    return pushClient.sendGamePushNotification({
      gameId: game.id,
      targetPlayerId: nextPlayer.id,
      targetRelayUrl: effectiveRelay || undefined,
      ntfyTopic: nextPlayer.ntfyTopic,
      title: message.title,
      body: message.body,
      url: message.url,
      tag: message.tag,
      icon: message.icon,
      action: 'turn',
    });
  }
}

export const storytellerNotificationService = new StorytellerNotificationService();
