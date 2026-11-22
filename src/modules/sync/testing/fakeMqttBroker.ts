/**
 * In-memory stand-in for the `mqtt` package in tests [ID: MODULES-SYNC-FAKE-BROKER]
 *
 * `vi.mock('mqtt', async () => (await import('…/fakeMqttBroker')).fakeMqttModule)` makes every
 * `MqttMailboxService` talk to `fakeBroker`, which records the raw wire payloads a broker-side
 * subscriber would see and can deliver them to every client (other "devices").
 */
import { parseEncryptedEnvelope } from '../roomCrypto';

export interface BrokerMessage {
  topic: string;
  payload: string;
  retain: boolean;
}

type Handler = (...args: unknown[]) => void;

class FakeMqttClient {
  connected = true;
  private handlers = new Map<string, Handler[]>();

  on(event: string, handler: Handler): this {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
    return this;
  }
  once(event: string, handler: Handler): this {
    return this.on(event, handler);
  }
  subscribe(): this {
    return this;
  }
  unsubscribe(): this {
    return this;
  }
  end(): this {
    return this;
  }
  publish(topic: string, payload: string, opts: { retain?: boolean }, cb?: (err?: Error) => void) {
    fakeBroker.published.push({ topic, payload: String(payload), retain: opts?.retain === true });
    cb?.();
    return this;
  }
  emit(event: string, ...args: unknown[]): void {
    for (const handler of this.handlers.get(event) ?? []) handler(...args);
  }
}

export const fakeBroker = {
  published: [] as BrokerMessage[],
  clients: [] as FakeMqttClient[],
  reset(): void {
    this.published = [];
  },
  on(topic: string): BrokerMessage[] {
    return this.published.filter((m) => m.topic === topic);
  },
  /** Delivers a raw payload on `topic` to every client, as the broker would. */
  deliver(topic: string, payload: string): void {
    const message = { length: payload.length, toString: () => payload };
    for (const client of this.clients) client.emit('message', topic, message);
  },
};

export const fakeMqttModule = {
  default: {
    connect: () => {
      const client = new FakeMqttClient();
      fakeBroker.clients.push(client);
      return client;
    },
  },
};

/** True when a broker-side subscriber sees an encrypted envelope and none of `secrets`. */
export function isCiphertextOnly(message: BrokerMessage, secrets: string[]): boolean {
  return (
    parseEncryptedEnvelope(message.payload) !== null &&
    secrets.every((secret) => !message.payload.includes(secret))
  );
}
