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

  it('handles exceptions and promise rejections from mailbox.publish gracefully', () => {
    const originalConsoleWarn = console.warn;
    console.warn = vi.fn(); // Suppress expected console.warn

    const onMessage = vi.fn();

    // 1. Mailbox publish throws synchronously
    const mockMailboxSyncThrow = {
      subscribe: vi.fn(() => vi.fn()),
      publish: vi.fn(() => {
        throw new Error('Synchronous publish error');
      }),
    } as unknown as MqttMailboxService<{ msg: string }>;

    const coordinatorSyncThrow = new MultiChannelSyncCoordinator<{ msg: string }>({
      channelId: 'room1',
      broadcastPrefix: 'test_prefix',
      mailbox: mockMailboxSyncThrow,
      onMessage,
    });

    expect(() => coordinatorSyncThrow.publish({ msg: 'test' })).not.toThrow();
    expect(console.warn).toHaveBeenCalledWith(
      '[MultiChannelSyncCoordinator] MQTT publish failed:',
      expect.any(Error),
    );

    (console.warn as any).mockClear();

    // 2. Mailbox publish rejects asynchronously
    const mockMailboxAsyncReject = {
      subscribe: vi.fn(() => vi.fn()),
      publish: vi.fn(() => Promise.reject(new Error('Async publish rejection'))),
    } as unknown as MqttMailboxService<{ msg: string }>;

    const coordinatorAsyncReject = new MultiChannelSyncCoordinator<{ msg: string }>({
      channelId: 'room2',
      broadcastPrefix: 'test_prefix',
      mailbox: mockMailboxAsyncReject,
      onMessage,
    });

    expect(() => coordinatorAsyncReject.publish({ msg: 'test' })).not.toThrow();

    // The promise rejection is caught inside `.catch()` so we can't easily assert on console.warn synchronously
    // without a flush, but we can verify it doesn't throw unhandled rejections.

    console.warn = originalConsoleWarn; // Restore
  });

  it('updates options dynamically and restarts channels when channelId changes', () => {
    const onMessage = vi.fn();
    const unsubMock1 = vi.fn();
    const unsubMock2 = vi.fn();
    const mockMailbox = {
      subscribe: vi.fn().mockReturnValueOnce(unsubMock1).mockReturnValueOnce(unsubMock2),
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

    coordinator.updateOptions({
      channelId: 'room2',
      broadcastPrefix: 'test_prefix',
      mailbox: mockMailbox,
      onMessage,
    });

    expect(unsubMock1).toHaveBeenCalled();
    expect(mockMailbox.subscribe).toHaveBeenCalledWith('room2', expect.any(Function));

    coordinator.stop();
    expect(unsubMock2).toHaveBeenCalled();
  });

  describe('selfEcho', () => {
    const peer = (name: string, onPeer: (data: unknown) => void): MockBroadcastChannel => {
      const ch = new MockBroadcastChannel(name);
      ch.onmessage = (event) => onPeer(event.data);
      return ch;
    };

    it('echoes own publishes by default (transient channel per message)', () => {
      const onMessage = vi.fn();
      const coordinator = new MultiChannelSyncCoordinator<{ msg: string }>({
        channelId: 'room1',
        broadcastPrefix: 'test_prefix',
        onMessage,
      });
      coordinator.start();
      coordinator.publish({ msg: 'echo' });

      expect(onMessage).toHaveBeenCalledWith({ msg: 'echo' }, 'broadcast');
      expect(MockBroadcastChannel.instances).toHaveLength(2);
      coordinator.stop();
    });

    it('selfEcho false: posts through the open listening channel, no echo, no allocation', () => {
      const onMessage = vi.fn();
      const onPeer = vi.fn();
      const coordinator = new MultiChannelSyncCoordinator<{ msg: string }>({
        channelId: 'control',
        broadcastPrefix: 'app_tv',
        onMessage,
        selfEcho: false,
      });
      coordinator.start();
      peer('app_tv_control', onPeer);
      const created = MockBroadcastChannel.instances.length;

      coordinator.publish({ msg: 'a' });
      coordinator.publish({ msg: 'b' });

      expect(onMessage).not.toHaveBeenCalled();
      expect(onPeer.mock.calls).toEqual([[{ msg: 'a' }], [{ msg: 'b' }]]);
      expect(MockBroadcastChannel.instances).toHaveLength(created);
      coordinator.stop();
    });

    it('selfEcho false: still receives other same-tab instances on the channel', () => {
      const onA = vi.fn();
      const onB = vi.fn();
      const options = { channelId: 'control', broadcastPrefix: 'app_tv', selfEcho: false };
      const a = new MultiChannelSyncCoordinator<{ msg: string }>({ ...options, onMessage: onA });
      const b = new MultiChannelSyncCoordinator<{ msg: string }>({ ...options, onMessage: onB });
      a.start();
      b.start();

      a.publish({ msg: 'from a' });

      expect(onA).not.toHaveBeenCalled();
      expect(onB).toHaveBeenCalledWith({ msg: 'from a' }, 'broadcast');
      a.stop();
      b.stop();
    });

    it('selfEcho false: falls back to a transient channel while not started or for another target', () => {
      const onPeer = vi.fn();
      const onOther = vi.fn();
      const coordinator = new MultiChannelSyncCoordinator<{ msg: string }>({
        channelId: 'control',
        broadcastPrefix: 'app_tv',
        onMessage: vi.fn(),
        selfEcho: false,
        enabled: false,
      });
      peer('app_tv_control', onPeer);
      peer('app_tv_other', onOther);

      coordinator.publish({ msg: 'publish-only' });
      coordinator.publish({ msg: 'elsewhere' }, 'other');

      expect(onPeer).toHaveBeenCalledWith({ msg: 'publish-only' });
      expect(onOther).toHaveBeenCalledWith({ msg: 'elsewhere' });
      expect(MockBroadcastChannel.instances.filter((c) => c.closed)).toHaveLength(2);
    });
  });
});
