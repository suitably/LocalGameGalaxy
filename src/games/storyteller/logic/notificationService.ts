import { pushClient } from '../../../lib/push/pushClient';
import { gameRelayStorage } from '../../../lib/push/gameRelayStorage';
import type { StoryGameRecord, StoryPlayer } from '../types';

class StorytellerNotificationService {
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public hasPermission(): boolean {
    if (!this.isSupported()) return false;
    return Notification.permission === 'granted';
  }

  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    try {
      const result = await Notification.requestPermission();
      return result === 'granted';
    } catch {
      return false;
    }
  }

  public async showLocalNotification(title: string, body: string, url?: string): Promise<void> {
    if (!this.hasPermission()) return;

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.showNotification(title, {
            body,
            icon: '/pwa/icon_full.png',
            badge: '/pwa/icon_full.png',
            tag: 'storyteller-turn',
            data: { url: url || window.location.href },
          });
          return;
        }
      }

      if (typeof window !== 'undefined' && 'Notification' in window) {
        new Notification(title, {
          body,
          icon: '/pwa/icon_full.png',
        });
      }
    } catch (e) {
      console.warn('[StorytellerNotificationService] Failed to show notification:', e);
    }
  }

  public async dispatchTurnPush(params: {
    game: StoryGameRecord;
    nextPlayer: StoryPlayer;
    authorName?: string;
  }): Promise<boolean> {
    const { game, nextPlayer, authorName } = params;
    const relay = gameRelayStorage.getGameRelay(game.id);
    if (!relay) {
      return false;
    }

    const gameName = game.name || 'Geschichtenschreiber';
    const title = `${gameName}: Du bist dran!`;
    const body = authorName
      ? `${authorName} hat den Abschnitt beendet. Du bist jetzt am Zug!`
      : 'Die Geschichte geht weiter – schreibe deinen Teil!';

    let url = `${window.location.origin}${window.location.pathname}#/games/storyteller?gameId=${game.id}&player=${nextPlayer.id}`;
    if (relay) {
      url += `&gameRelay=${encodeURIComponent(relay)}`;
    }

    return pushClient.sendGamePushNotification({
      gameId: game.id,
      targetPlayerId: nextPlayer.id,
      title,
      body,
      url,
      action: 'turn',
    });
  }
}

export const storytellerNotificationService = new StorytellerNotificationService();
