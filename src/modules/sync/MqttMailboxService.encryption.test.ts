import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MqttMailboxService } from './MqttMailboxService';
import { decryptPayload, generateRoomKey } from './roomCrypto';
import { fakeBroker, isCiphertextOnly } from './testing/fakeMqttBroker';

vi.mock('mqtt', async () => (await import('./testing/fakeMqttBroker')).fakeMqttModule);

type Msg = { kind: 'state' | 'ping'; secret: string };
const TOPIC = 'lgg/e2e/ch1';

function device(key: string | null) {
  return new MqttMailboxService<Msg>({
    topicPrefix: 'lgg/e2e',
    keyFor: () => key,
    retain: (m) => m.kind === 'state',
  });
}

describe('MqttMailboxService end-to-end encryption (ADR 0009)', () => {
  beforeEach(() => fakeBroker.reset());

  it('publishes only ciphertext for a keyed channel and retains only last state', async () => {
    const key = generateRoomKey();
    const host = device(key);
    await host.publish('ch1', { kind: 'state', secret: 'Alice-roster' });
    await host.publish('ch1', { kind: 'ping', secret: 'Bob-ping' });

    const [state, ping] = fakeBroker.on(TOPIC);
    expect(isCiphertextOnly(state, ['Alice-roster'])).toBe(true);
    expect(isCiphertextOnly(ping, ['Bob-ping'])).toBe(true);
    expect([state.retain, ping.retain]).toEqual([true, false]);
    // Inside the envelope: the usual (LZ-compressed) message.
    expect(await decryptPayload(state.payload, key)).toMatch(/^LZ:|Alice-roster/);
    host.disconnect();
  });

  it('delivers to devices with the key; others are told the room is locked', async () => {
    const key = generateRoomKey();
    const host = device(key);
    const guest = device(key);
    const stranger = device(null);
    const onGuest = vi.fn();
    const onStranger = vi.fn();
    const onLocked = vi.fn();
    guest.subscribe('ch1', onGuest);
    stranger.subscribe('ch1', onStranger);
    stranger.onLockedChannel(onLocked);

    await host.publish('ch1', { kind: 'state', secret: 's1' });
    fakeBroker.deliver(TOPIC, fakeBroker.on(TOPIC)[0].payload);

    await vi.waitFor(() => {
      expect(onGuest).toHaveBeenCalledWith(
        { kind: 'state', secret: 's1' },
        'ch1',
        expect.any(Number),
      );
      expect(onLocked).toHaveBeenCalledWith('ch1');
    });
    expect(onStranger).not.toHaveBeenCalled();
    [host, guest, stranger].forEach((d) => d.disconnect());
  });

  it('ignores plaintext and tampered messages in an encrypted room', async () => {
    const key = generateRoomKey();
    const guest = device(key);
    const listener = vi.fn();
    guest.subscribe('ch1', listener);

    const plain = device(null);
    await plain.publish('ch1', { kind: 'state', secret: 'injected' });
    fakeBroker.deliver(TOPIC, fakeBroker.on(TOPIC)[0].payload);
    const wrongKey = device(generateRoomKey());
    await wrongKey.publish('ch1', { kind: 'state', secret: 'forged' });
    fakeBroker.deliver(TOPIC, fakeBroker.on(TOPIC)[1].payload);
    // A genuine message afterwards: once it arrived, the two before it were handled too.
    const host = device(key);
    await host.publish('ch1', { kind: 'state', secret: 'genuine' });
    fakeBroker.deliver(TOPIC, fakeBroker.on(TOPIC)[2].payload);

    await vi.waitFor(() => expect(listener).toHaveBeenCalled());
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toEqual({ kind: 'state', secret: 'genuine' });
    [guest, plain, wrongKey, host].forEach((d) => d.disconnect());
  });

  it('keeps legacy rooms without a key working in plaintext (one-release transition)', async () => {
    const oldHost = device(null);
    const guest = device(null);
    const listener = vi.fn();
    guest.subscribe('ch1', listener);

    await oldHost.publish('ch1', { kind: 'state', secret: 'legacy' });
    const [wire] = fakeBroker.on(TOPIC);
    expect(isCiphertextOnly(wire, [])).toBe(false);
    fakeBroker.deliver(TOPIC, wire.payload);

    await vi.waitFor(() =>
      expect(listener).toHaveBeenCalledWith(
        { kind: 'state', secret: 'legacy' },
        'ch1',
        expect.any(Number),
      ),
    );
    [oldHost, guest].forEach((d) => d.disconnect());
  });
});
