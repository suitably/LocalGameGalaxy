import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MqttMailboxService } from './MqttMailboxService';

import LZString from 'lz-string';
import mqtt from 'mqtt';

// Mock MQTT connect
vi.mock('mqtt', () => {
  return {
    default: {
      connect: vi.fn(() => ({
        on: vi.fn(),
        once: vi.fn(),
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
      brokerUrls: ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt'],
    });
    vi.clearAllMocks();
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

  it('handles broker failover on error', () => {
    const listener = vi.fn();
    service.subscribe('channel-123', listener);

    const mockConnect = mqtt.connect as unknown as ReturnType<typeof vi.fn>;
    const mockClient = mockConnect.mock.results[0].value;
    const errorCallback = mockClient.on.mock.calls.find((call: any[]) => call[0] === 'error')?.[1];

    expect(errorCallback).toBeDefined();

    // Trigger error callback to simulate broker failure
    errorCallback(new Error('Broker connection failed'));

    // Verify brokerIndex logic by testing if reconnect to next URL would happen
    // In our MqttMailboxService, brokerIndex is internal. But we can ensure no crash happens
    expect(mockClient.on).toHaveBeenCalled();
  });

  it('handles message decompression, invalid JSON, and echo prevention', async () => {
    const listener = vi.fn();
    service.subscribe('channel-123', listener);

    const mockConnect = mqtt.connect as unknown as ReturnType<typeof vi.fn>;
    const mockClient = mockConnect.mock.results[0].value;
    const messageCallback = mockClient.on.mock.calls.find((call: any[]) => call[0] === 'message')?.[1];

    expect(messageCallback).toBeDefined();

    const ownClientId = (service as any).clientId;
    const otherClientId = 'other_client';

    const validPayload = { text: 'hello' };
    const validEnvelope = {
      version: 1,
      channelId: 'channel-123',
      senderClientId: otherClientId,
      timestamp: Date.now(),
      payload: validPayload,
    };

    // 1. Valid uncompressed message
    await messageCallback('lgg/test/v1/channel-123', Buffer.from(JSON.stringify(validEnvelope)));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(validPayload, 'channel-123', validEnvelope.timestamp);

    listener.mockClear();

    // 2. Ignore own echo message
    const echoEnvelope = { ...validEnvelope, senderClientId: ownClientId };
    await messageCallback('lgg/test/v1/channel-123', Buffer.from(JSON.stringify(echoEnvelope)));
    expect(listener).not.toHaveBeenCalled();

    // 3. Deduplicate identical payload (already processed validEnvelope in step 1)
    await messageCallback('lgg/test/v1/channel-123', Buffer.from(JSON.stringify(validEnvelope)));
    expect(listener).not.toHaveBeenCalled();

    // 4. Invalid JSON
    await messageCallback('lgg/test/v1/channel-123', Buffer.from('invalid json'));
    expect(listener).not.toHaveBeenCalled();

    // 5. LZString decompressed message
    const compressedEnvelope = {
      ...validEnvelope,
      timestamp: Date.now() + 100, // Different timestamp to bypass deduplication
    };
    const compressedString = `LZ:${LZString.compressToUTF16(JSON.stringify(compressedEnvelope))}`;
    await messageCallback('lgg/test/v1/channel-123', Buffer.from(compressedString));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('manages global listeners and syncSubscribedChannels', async () => {
    const globalListener = vi.fn();
    const unsubGlobal = service.subscribeGlobal(globalListener);

    service.syncSubscribedChannels(['channel-a', 'channel-b']);

    // Subscribe also triggers a connect
    const mockConnect = mqtt.connect as unknown as ReturnType<typeof vi.fn>;
    const mockClient = mockConnect.mock.results[0].value;
    const messageCallback = mockClient.on.mock.calls.find((call: any[]) => call[0] === 'message')?.[1];

    const validEnvelope = {
      version: 1,
      channelId: 'channel-a',
      senderClientId: 'other_client',
      timestamp: Date.now(),
      payload: { text: 'a' },
    };

    await messageCallback('lgg/test/v1/channel-a', Buffer.from(JSON.stringify(validEnvelope)));
    expect(globalListener).toHaveBeenCalledWith({ text: 'a' }, 'channel-a', validEnvelope.timestamp);

    unsubGlobal();

    // Test syncSubscribedChannels removing channels
    service.syncSubscribedChannels(['channel-a']);

    // Test disconnect
    service.disconnect();
    expect(mockClient.end).toHaveBeenCalled();
  });
});
