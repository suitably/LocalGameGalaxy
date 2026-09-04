import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MqttMailboxService } from './MqttMailboxService';

// Mock MQTT connect
vi.mock('mqtt', () => {
  return {
    default: {
      connect: vi.fn(() => ({
        on: vi.fn(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        publish: vi.fn((_t, _p, _o, cb) => cb && cb()),
        end: vi.fn(),
        connected: true,
      })),
    },
  };
});

describe('MqttMailboxService', () => {
  let service: MqttMailboxService<{ text: string }>;

  beforeEach(() => {
    service = new MqttMailboxService<{ text: string }>({
      topicPrefix: 'lgg/test/v1',
      clientPrefix: 'test_client',
      useCompression: false,
    });
  });

  it('subscribes and unsubscribes properly without errors', () => {
    const listener = vi.fn();
    const unsub = service.subscribe('channel-123', listener);

    expect(typeof unsub).toBe('function');
    unsub();
    service.disconnect();
  });

  it('publishes without throwing an exception', () => {
    expect(() => {
      service.publish('channel-123', { text: 'hello' });
    }).not.toThrow();
    service.disconnect();
  });
});
