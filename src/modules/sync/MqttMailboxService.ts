/**
 * Generic MQTT Mailbox Service [ID: MODULES-SYNC-MQTT]
 *
 * Provides a resilient, serverless MQTT communication layer over public WSS brokers
 * (HiveMQ, EMQX) with automatic reconnect, message deduplication, and LZString compression.
 *
 * Following SOLID Dependency Inversion (DIP):
 * This service contains NO game-specific domain logic or engine imports.
 * Games inject their own typed listeners to handle snapshots and state transitions.
 */

import mqtt, { type MqttClient } from 'mqtt';
import LZString from 'lz-string';

export const DEFAULT_BROKER_URLS = [
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://broker.emqx.io:8084/mqtt',
];

export interface MqttEnvelope<T> {
  version: number;
  channelId: string;
  senderClientId: string;
  timestamp: number;
  payload: T;
}

export type MessageListener<T> = (payload: T, channelId: string, timestamp: number) => Promise<void> | void;

export interface MqttMailboxOptions {
  topicPrefix: string;
  clientPrefix?: string;
  brokerUrls?: string[];
  useCompression?: boolean;
}

export class MqttMailboxService<T> {
  private client: MqttClient | null = null;
  private subscribedChannels: Set<string> = new Set();
  private listeners: Map<string, Set<MessageListener<T>>> = new Map();
  private globalListeners: Set<MessageListener<T>> = new Set();
  private readonly clientId: string;
  private readonly topicPrefix: string;
  private readonly brokerUrls: string[];
  private readonly useCompression: boolean;
  private brokerIndex = 0;
  private lastProcessedRaw: Map<string, string> = new Map();

  constructor(options: MqttMailboxOptions) {
    this.topicPrefix = options.topicPrefix.endsWith('/') ? options.topicPrefix : `${options.topicPrefix}/`;
    this.brokerUrls = options.brokerUrls && options.brokerUrls.length > 0 ? options.brokerUrls : DEFAULT_BROKER_URLS;
    this.useCompression = options.useCompression ?? true;
    const prefix = options.clientPrefix || 'lgg_sync';
    this.clientId = `${prefix}_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
  }

  private getTopic(channelId: string): string {
    return `${this.topicPrefix}${channelId}`;
  }

  private getChannelIdFromTopic(topic: string): string | null {
    if (topic.startsWith(this.topicPrefix)) {
      return topic.slice(this.topicPrefix.length);
    }
    return null;
  }

  private getClient(): MqttClient {
    if (this.client) {
      return this.client;
    }

    const brokerUrl = this.brokerUrls[this.brokerIndex];
    const client = mqtt.connect(brokerUrl, {
      clientId: this.clientId,
      clean: true,
      keepalive: 60,
      connectTimeout: 10000,
      reconnectPeriod: 5000,
    });

    client.on('connect', () => {
      for (const channelId of this.subscribedChannels) {
        const topic = this.getTopic(channelId);
        client.subscribe(topic, { qos: 1 });
      }
    });

    client.on('error', (err) => {
      console.warn(`[MqttMailbox:${this.topicPrefix}] Broker error (${brokerUrl}):`, err);
      if (this.brokerUrls.length > 1) {
        this.brokerIndex = (this.brokerIndex + 1) % this.brokerUrls.length;
      }
    });

    client.on('message', async (topic, message) => {
      if (!message || message.length === 0) return;

      const channelId = this.getChannelIdFromTopic(topic);
      if (!channelId || !this.subscribedChannels.has(channelId)) return;

      try {
        const rawStr = message.toString();
        if (!rawStr || rawStr === '{}') return;

        let decompressed = rawStr;
        if (rawStr.startsWith('LZ:')) {
          decompressed = LZString.decompressFromUTF16(rawStr.slice(3)) || '';
        }

        if (!decompressed) return;

        // Skip duplicate processing of exact same payload
        if (this.lastProcessedRaw.get(channelId) === decompressed) return;

        const envelope: MqttEnvelope<T> = JSON.parse(decompressed);
        if (!envelope || envelope.channelId !== channelId) {
          return;
        }

        // Ignore own echo messages
        if (envelope.senderClientId === this.clientId) {
          return;
        }

        this.lastProcessedRaw.set(channelId, decompressed);

        // Notify specific channel listeners
        const channelListeners = this.listeners.get(channelId);
        if (channelListeners) {
          for (const listener of channelListeners) {
            try {
              await listener(envelope.payload, channelId, envelope.timestamp);
            } catch (err) {
              console.warn(`[MqttMailbox:${this.topicPrefix}] Channel listener error:`, err);
            }
          }
        }

        // Notify global listeners
        for (const listener of this.globalListeners) {
          try {
            await listener(envelope.payload, channelId, envelope.timestamp);
          } catch (err) {
            console.warn(`[MqttMailbox:${this.topicPrefix}] Global listener error:`, err);
          }
        }
      } catch (err) {
        console.warn(`[MqttMailbox:${this.topicPrefix}] Failed to parse message:`, err);
      }
    });

    this.client = client;
    return client;
  }

  public subscribe(channelId: string, listener: MessageListener<T>): () => void {
    this.subscribedChannels.add(channelId);

    if (!this.listeners.has(channelId)) {
      this.listeners.set(channelId, new Set());
    }
    this.listeners.get(channelId)!.add(listener);

    const client = this.getClient();
    if (client.connected) {
      client.subscribe(this.getTopic(channelId), { qos: 1 });
    }

    return () => {
      const channelSet = this.listeners.get(channelId);
      if (channelSet) {
        channelSet.delete(listener);
        if (channelSet.size === 0) {
          this.listeners.delete(channelId);
          this.subscribedChannels.delete(channelId);
          if (this.client?.connected) {
            this.client.unsubscribe(this.getTopic(channelId));
          }
        }
      }
    };
  }

  public publish(channelId: string, payload: T): void {
    const envelope: MqttEnvelope<T> = {
      version: 1,
      channelId,
      senderClientId: this.clientId,
      timestamp: Date.now(),
      payload,
    };

    const json = JSON.stringify(envelope);
    this.lastProcessedRaw.set(channelId, json);

    let messageToSend = json;
    if (this.useCompression) {
      const compressed = LZString.compressToUTF16(json);
      if (compressed && compressed.length < json.length) {
        messageToSend = `LZ:${compressed}`;
      }
    }

    const topic = this.getTopic(channelId);
    const client = this.getClient();

    if (client.connected) {
      client.publish(topic, messageToSend, { qos: 1, retain: true }, (err) => {
        if (err) {
          console.warn(`[MqttMailbox:${this.topicPrefix}] Failed to publish to ${topic}:`, err);
        }
      });
    } else {
      client.once('connect', () => {
        client.publish(topic, messageToSend, { qos: 1, retain: true });
      });
    }
  }

  public disconnect(): void {
    if (this.client) {
      this.client.end(true);
      this.client = null;
    }
    this.subscribedChannels.clear();
    this.listeners.clear();
    this.globalListeners.clear();
  }
}
