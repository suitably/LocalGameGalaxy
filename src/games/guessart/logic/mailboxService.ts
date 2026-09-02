import mqtt, { type MqttClient } from 'mqtt';
import LZString from 'lz-string';
import type { GameSnapshot } from './types';
import { LocalGameEngine } from './engine';
import { guessArtNotificationService } from './notificationService';

const BROKER_URLS = [
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://broker.emqx.io:8084/mqtt',
];

interface TurnEnvelope {
  version: 2;
  gameId: string;
  senderClientId: string;
  timestamp: number;
  snapshot: GameSnapshot;
}

type RemoteSnapshotListener = (snapshot: GameSnapshot, gameId: string) => Promise<void> | void;

class GuessArtMailboxService {
  private client: MqttClient | null = null;
  private subscribedGameIds: Set<string> = new Set();
  private listeners: Set<RemoteSnapshotListener> = new Set();
  private activeScreenGameId: string | null = null;
  private readonly clientId = `lgg_ga_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
  private lastProcessedJson: Map<string, string> = new Map();

  private getTopic(gameId: string): string {
    return `lgg/guessart/v2/${gameId}`;
  }

  private getGameIdFromTopic(topic: string): string | null {
    const prefix = 'lgg/guessart/v2/';
    if (topic.startsWith(prefix)) {
      return topic.slice(prefix.length);
    }
    return null;
  }

  private brokerIndex = 0;

  private getClient(): MqttClient {
    if (this.client) {
      return this.client;
    }

    const brokerUrl = BROKER_URLS[this.brokerIndex];
    const client = mqtt.connect(brokerUrl, {
      clientId: this.clientId,
      clean: true,
      keepalive: 60,
      connectTimeout: 10000,
      reconnectPeriod: 5000,
    });

    client.on('connect', () => {
      // Re-subscribe to all active games on connect / reconnect
      for (const gameId of this.subscribedGameIds) {
        const topic = this.getTopic(gameId);
        client.subscribe(topic, { qos: 1 });
      }
    });

    client.on('error', (err) => {
      console.warn(`[GuessArt Mailbox] MQTT error on broker (${brokerUrl}):`, err);
      if (BROKER_URLS.length > 1) {
        this.brokerIndex = (this.brokerIndex + 1) % BROKER_URLS.length;
      }
    });

    client.on('message', async (topic, message) => {
      if (!message || message.length === 0) return;

      const gameId = this.getGameIdFromTopic(topic);
      if (!gameId || !this.subscribedGameIds.has(gameId)) return;

      try {
        const rawStr = message.toString();
        if (!rawStr || rawStr === '{}') return;

        let decompressed = rawStr;
        if (rawStr.startsWith('LZ:')) {
          decompressed = LZString.decompressFromUTF16(rawStr.slice(3)) || '';
        }

        if (!decompressed) return;

        // Skip duplicate processing of exact same payload for this game
        if (this.lastProcessedJson.get(gameId) === decompressed) return;

        const envelope: TurnEnvelope = JSON.parse(decompressed);
        if (!envelope || envelope.gameId !== gameId) {
          return;
        }

        // Ignore own echo messages
        if (envelope.senderClientId === this.clientId) {
          return;
        }

        this.lastProcessedJson.set(gameId, decompressed);

        if (envelope.snapshot) {
          await this.handleIncomingRemoteSnapshot(envelope.snapshot, gameId);
        }
      } catch (e) {
        console.warn('[GuessArt Mailbox] Failed to parse message:', e);
      }
    });

    this.client = client;
    return client;
  }

  private async handleIncomingRemoteSnapshot(snapshot: GameSnapshot, gameId: string): Promise<void> {
    try {
      const language = snapshot.game?.options?.language || 'de';
      const importResult = await LocalGameEngine.importSnapshot(snapshot, language);

      if (importResult.updated) {
        // Evaluate and trigger notification if eligible
        await guessArtNotificationService.notifyTurnIfEligible({
          game: importResult.game,
          round: importResult.round,
          isRemoteEvent: true,
          activeGameScreenId: this.activeScreenGameId,
          isDocumentVisible: typeof document !== 'undefined' ? document.visibilityState === 'visible' : true,
        });
      }

      // Notify all active in-memory listeners
      for (const listener of this.listeners) {
        try {
          await listener(snapshot, gameId);
        } catch (err) {
          console.warn('[GuessArt Mailbox] Listener error:', err);
        }
      }
    } catch (err) {
      console.warn('[GuessArt Mailbox] Failed to process incoming remote snapshot:', err);
    }
  }

  /**
   * Publishes a game turn snapshot to the ephemeral mailbox as a retained message.
   */
  public async publishTurn(gameId: string, snapshot: GameSnapshot): Promise<boolean> {
    try {
      const client = this.getClient();
      const topic = this.getTopic(gameId);

      const envelope: TurnEnvelope = {
        version: 2,
        gameId,
        senderClientId: this.clientId,
        timestamp: Date.now(),
        snapshot,
      };

      const json = JSON.stringify(envelope);
      this.lastProcessedJson.set(gameId, json);
      const compressed = `LZ:${LZString.compressToUTF16(json)}`;

      return new Promise((resolve) => {
        client.publish(topic, compressed, { retain: true, qos: 1 }, (err) => {
          if (err) {
            console.warn('[GuessArt Mailbox] Publish error:', err);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    } catch (e) {
      console.warn('[GuessArt Mailbox] Failed to publish turn:', e);
      return false;
    }
  }

  /**
   * Synchronizes subscribed game IDs with the MQTT client.
   */
  public syncSubscribedGames(gameIds: string[]): void {
    try {
      const client = this.getClient();
      const newSet = new Set(gameIds.filter(Boolean));

      // Subscribe to any new games
      for (const id of newSet) {
        if (!this.subscribedGameIds.has(id)) {
          this.subscribedGameIds.add(id);
          if (client.connected) {
            client.subscribe(this.getTopic(id), { qos: 1 });
          }
        }
      }

      // Unsubscribe from removed games
      for (const id of this.subscribedGameIds) {
        if (!newSet.has(id)) {
          this.subscribedGameIds.delete(id);
          this.lastProcessedJson.delete(id);
          if (client.connected) {
            client.unsubscribe(this.getTopic(id));
          }
        }
      }
    } catch (e) {
      console.warn('[GuessArt Mailbox] Failed to sync subscriptions:', e);
    }
  }

  /**
   * Sets the game ID currently being viewed by the user on screen.
   */
  public setActiveScreenGameId(gameId: string | null): void {
    this.activeScreenGameId = gameId;
  }

  /**
   * Registers a listener for remote snapshot updates.
   */
  public onRemoteSnapshot(listener: RemoteSnapshotListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Convenience method to subscribe to a single game and register a callback (backward-compatible).
   */
  public subscribeToGame(
    gameId: string,
    onSnapshot?: (snapshot: GameSnapshot) => Promise<void>,
  ): () => void {
    this.syncSubscribedGames([...Array.from(this.subscribedGameIds), gameId]);
    this.setActiveScreenGameId(gameId);

    if (onSnapshot) {
      return this.onRemoteSnapshot(async (snapshot, snapshotGameId) => {
        if (snapshotGameId === gameId) {
          await onSnapshot(snapshot);
        }
      });
    }
    return () => {};
  }

  /**
   * Unsubscribe active screen view
   */
  public unsubscribe(): void {
    this.setActiveScreenGameId(null);
  }
}

export const mailboxService = new GuessArtMailboxService();
