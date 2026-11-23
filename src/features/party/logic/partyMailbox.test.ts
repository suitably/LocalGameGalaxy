import { describe, it, expect, vi } from 'vitest';
import { universalPartyManager } from './universalPartyManager';
import { getRoomKey } from '../../../modules/sync/roomKeys';
import { fakeBroker, isCiphertextOnly } from '../../../modules/sync/testing/fakeMqttBroker';

vi.mock(
  'mqtt',
  async () => (await import('../../../modules/sync/testing/fakeMqttBroker')).fakeMqttModule,
);

describe('party topic end-to-end encryption (ADR 0009)', () => {
  it('a new room gets a key and the broker sees only ciphertext; presence is not retained', async () => {
    fakeBroker.reset();
    universalPartyManager.createParty('Hostina', 'E2EROOM');
    const topic = 'lgg/party/party_E2EROOM';
    // The first presence ping and the room state, both encrypted asynchronously.
    await vi.waitFor(
      () => expect(new Set(fakeBroker.on(topic).map((m) => m.retain)).size).toBe(2),
      {
        timeout: 5000,
      },
    );

    expect(getRoomKey('E2EROOM')).toBeTruthy();
    const messages = fakeBroker.on(topic);
    expect(messages.every((m) => isCiphertextOnly(m, ['Hostina', 'E2EROOM']))).toBe(true);
    universalPartyManager.leaveParty('E2EROOM');
  });
});
