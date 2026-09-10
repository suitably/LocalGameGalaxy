import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MultiChannelSyncCoordinator } from './useMultiChannelSync';
import type { MqttMailboxService } from './MqttMailboxService';

class MockBroadcastChannel {
  public name: string;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public closed = false;
  public static instances: MockBroadcastChannel[] = [];

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  public postMessage(data: unknown): void {
    // Send to other instances with the same name
    for (const inst of MockBroadcastChannel.instances) {
      if (inst !== this && inst.name === this.name && !inst.closed && inst.onmessage) {
        inst.onmessage({ data } as MessageEvent);
      }
    }
  }

  public close(): void {
    this.closed = true;
  }
}

describe('MultiChannelSyncCoordinator', () => {
  let originalBroadcastChannel: typeof globalThis.BroadcastChannel;

  beforeEach(() => {
    originalBroadcastChannel = globalThis.BroadcastChannel;
    MockBroadcastChannel.instances = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.BroadcastChannel = MockBroadcastChannel as any;
  });

  afterEach(() => {
    globalThis.BroadcastChannel = originalBroadcastChannel;
    MockBroadcastChannel.instances = [];
  });

  it('starts and attaches listeners to BroadcastChannel and MQTT mailbox', () => {
    const onMessage = vi.fn();
    const unsubMock = vi.fn();
    const mockMailbox = {
      subscribe: vi.fn(() => unsubMock),
      publish: vi.fn().mockResolvedValue(true),
    } as unknown as MqttMailboxService<{ msg: string }>;

    const coordinator = new MultiChannelSyncCoordinator<{ msg: string }>({
      channelId: 'room1',
      broadcastPrefix: 'test_prefix',
      mailbox: mockMailbox,
      onMessage,
    });

    coordinator.start();

    expect(mockMailbox.subscribe).toHaveBeenCalledWith('room1', expect.any(Function));
    expect(MockBroadcastChannel.instances.length).toBe(1);
    expect(MockBroadcastChannel.instances[0].name).toBe('test_prefix_room1');

    coordinator.stop();
    expect(unsubMock).toHaveBeenCalled();
    expect(MockBroadcastChannel.instances[0].closed).toBe(true);
  });

  it('handles incoming BroadcastChannel message with source broadcast', () => {
    const onMessage = vi.fn();
    const coordinator = new MultiChannelSyncCoordinator<{ msg: string }>({
      channelId: 'room1',
      broadcastPrefix: 'test_prefix',
      onMessage,
    });

    coordinator.start();

    const receiverChannel = MockBroadcastChannel.instances[0];
    receiverChannel.onmessage?.({ data: { msg: 'hello broadcast' } } as MessageEvent);

    expect(onMessage).toHaveBeenCalledWith({ msg: 'hello broadcast' }, 'broadcast');
    coordinator.stop();
  });

  it('handles incoming MQTT message with source mqtt', () => {
    const onMessage = vi.fn();
    let mqttListener: ((payload: { msg: string }) => void) | null = null;
    const mockMailbox = {
      subscribe: vi.fn((_ch, listener) => {
        mqttListener = listener;
        return vi.fn();
      }),
      publish: vi.fn().mockResolvedValue(true),
    } as unknown as MqttMailboxService<{ msg: string }>;

    const coordinator = new MultiChannelSyncCoordinator<{ msg: string }>({
      channelId: 'room1',
      broadcastPrefix: 'test_prefix',
      mailbox: mockMailbox,
      onMessage,
    });

    coordinator.start();

    expect(mqttListener).toBeDefined();
    mqttListener!({ msg: 'hello mqtt' });

    expect(onMessage).toHaveBeenCalledWith({ msg: 'hello mqtt' }, 'mqtt');
    coordinator.stop();
  });

  it('publishes to both BroadcastChannel and MQTT', () => {
    const onMessage = vi.fn();
    const mockMailbox = {
      subscribe: vi.fn(() => vi.fn()),
      publish: vi.fn().mockResolvedValue(true),
    } as unknown as MqttMailboxService<{ msg: string }>;

    const coordinator = new MultiChannelSyncCoordinator<{ msg: string }>({
      channelId: 'room1',
      broadcastPrefix: 'test_prefix',
      mailbox: mockMailbox,
      onMessage,
    });

    coordinator.start();
    coordinator.publish({ msg: 'test publish' });

    expect(mockMailbox.publish).toHaveBeenCalledWith('room1', { msg: 'test publish' });
    coordinator.stop();
  });

  it('supports publishing to targetChannelId when specified', () => {
    const onMessage = vi.fn();
    const mockMailbox = {
      subscribe: vi.fn(() => vi.fn()),
      publish: vi.fn().mockResolvedValue(true),
    } as unknown as MqttMailboxService<{ msg: string }>;

    const coordinator = new MultiChannelSyncCoordinator<{ msg: string }>({
      channelId: 'room1',
      broadcastPrefix: 'test_prefix',
      mailbox: mockMailbox,
      onMessage,
    });

    coordinator.publish({ msg: 'custom channel' }, 'custom_room');

    expect(mockMailbox.publish).toHaveBeenCalledWith('custom_room', { msg: 'custom channel' });
  });

  it('safely works without mailbox (BroadcastChannel only)', () => {
    const onMessage = vi.fn();
    const coordinator = new MultiChannelSyncCoordinator<{ msg: string }>({
      channelId: 'room1',
      broadcastPrefix: 'gartic_phone',
      onMessage,
    });

    expect(() => coordinator.start()).not.toThrow();
    expect(() => coordinator.publish({ msg: 'only bc' })).not.toThrow();
    expect(() => coordinator.stop()).not.toThrow();
  });
});
