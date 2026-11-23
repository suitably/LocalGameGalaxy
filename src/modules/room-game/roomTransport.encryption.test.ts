import { describe, it, expect, vi } from 'vitest';
import { getRoomTransport } from './roomTransport';
import { ensureRoomKey } from '../sync/roomKeys';
import { fakeBroker, isCiphertextOnly } from '../sync/testing/fakeMqttBroker';

vi.mock('mqtt', async () => (await import('../sync/testing/fakeMqttBroker')).fakeMqttModule);

describe('room-game topic end-to-end encryption (ADR 0009)', () => {
  it('encrypts every room message with the room key and retains only the state', async () => {
    fakeBroker.reset();
    ensureRoomKey('R9', 'session');
    const transport = getRoomTransport('R9');
    transport.publish('knister_R9', { kind: 'hello', from: 'p-Alice' });
    transport.publish('knister_R9', { kind: 'state', rev: 1, state: { sheet: 'Alice-sheet' } });
    transport.publish('knister_R9_live', { kind: 'event', text: 'Alice-live' });
    await vi.waitFor(() => expect(fakeBroker.on('lgg/room/knister_R9_live')).toHaveLength(1), {
      timeout: 5000,
    });

    const [hello, state] = fakeBroker.on('lgg/room/knister_R9');
    const [live] = fakeBroker.on('lgg/room/knister_R9_live');
    for (const m of [hello, state, live]) {
      expect(isCiphertextOnly(m, ['Alice'])).toBe(true);
    }
    expect([hello.retain, state.retain, live.retain]).toEqual([false, true, false]);
  });
});
