import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MultiChannelSyncCoordinator } from '../../../modules/sync';
import { QUEUE_SYNC, TV_CONTROL_SYNC, type TvControlMessage } from './syncChannels';

/** Same-tab BroadcastChannel stand-in: delivers to every other open instance with the same name. */
class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  closed = false;
  name: string;

  constructor(name: string) {
    this.name = name;
    FakeBroadcastChannel.instances.push(this);
  }

  postMessage(data: unknown): void {
    for (const other of FakeBroadcastChannel.instances) {
      if (other !== this && other.name === this.name && !other.closed) {
        other.onmessage?.({ data } as MessageEvent);
      }
    }
  }

  close(): void {
    this.closed = true;
  }
}

/** A hand-held channel as the pre-migration code (or an older TV window) used it. */
const rawChannel = (name: string, onData: (data: unknown) => void): FakeBroadcastChannel => {
  const channel = new FakeBroadcastChannel(name);
  channel.onmessage = (event) => onData(event.data);
  return channel;
};

const tvControl = (onMessage: (message: TvControlMessage) => void) =>
  new MultiChannelSyncCoordinator<TvControlMessage>({
    ...TV_CONTROL_SYNC,
    selfEcho: false,
    onMessage,
  });

describe('Melodiq sync channels', () => {
  const original = globalThis.BroadcastChannel;

  beforeEach(() => {
    FakeBroadcastChannel.instances = [];
    globalThis.BroadcastChannel = FakeBroadcastChannel as unknown as typeof BroadcastChannel;
  });

  afterEach(() => {
    globalThis.BroadcastChannel = original;
  });

  it('keeps the legacy channel names on the wire', () => {
    const tv = tvControl(vi.fn());
    const queue = new MultiChannelSyncCoordinator({ ...QUEUE_SYNC, onMessage: vi.fn() });
    tv.start();
    queue.start();

    expect(FakeBroadcastChannel.instances.map((c) => c.name)).toEqual([
      'melodiq_tv_control',
      'melodiq_queue_channel',
    ]);
  });

  it('exchanges unchanged { type, payload } messages with a hand-held channel', () => {
    const onMessage = vi.fn();
    const onRaw = vi.fn();
    const host = tvControl(onMessage);
    host.start();
    const tvWindow = rawChannel('melodiq_tv_control', onRaw);

    host.publish({ type: 'GAME_STATE', payload: { currentTime: 12.5 } });
    tvWindow.postMessage({ type: 'PONG' });

    expect(onRaw).toHaveBeenCalledWith({ type: 'GAME_STATE', payload: { currentTime: 12.5 } });
    expect(onMessage).toHaveBeenCalledWith({ type: 'PONG' }, 'broadcast');
  });

  it('like a hand-held channel, a hook never hears itself but hears same-tab hooks', () => {
    const tvMode = vi.fn();
    const settings = vi.fn();
    const tvModeSync = tvControl(tvMode);
    const settingsSync = tvControl(settings);
    tvModeSync.start();
    settingsSync.start();

    settingsSync.publish({ type: 'SETTINGS_UPDATE', payload: { volume: 0.5 } });
    tvModeSync.publish({ type: 'PING' });

    expect(settings).toHaveBeenCalledTimes(1);
    expect(settings).toHaveBeenCalledWith({ type: 'PING' }, 'broadcast');
    expect(tvMode).toHaveBeenCalledTimes(1);
    expect(tvMode).toHaveBeenCalledWith(
      { type: 'SETTINGS_UPDATE', payload: { volume: 0.5 } },
      'broadcast',
    );
  });

  it('publish-only use (session end) posts SONG_ENDED without opening a listener', () => {
    const onRaw = vi.fn();
    const host = rawChannel('melodiq_tv_control', onRaw);
    const sessionEnd = new MultiChannelSyncCoordinator<TvControlMessage>({
      ...TV_CONTROL_SYNC,
      enabled: false,
      onMessage: vi.fn(),
    });
    sessionEnd.start();

    sessionEnd.publish({ type: 'SONG_ENDED' });

    expect(onRaw).toHaveBeenCalledWith({ type: 'SONG_ENDED' });
    expect(FakeBroadcastChannel.instances.filter((c) => c !== host).every((c) => c.closed)).toBe(
      true,
    );
  });
});
