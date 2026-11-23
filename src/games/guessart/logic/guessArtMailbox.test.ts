import { describe, it, expect, vi } from 'vitest';
import { guessArtMailbox } from './guessArtMailbox';
import type { GameSnapshot } from './types';
import { ensureRoomKey } from '../../../modules/sync/roomKeys';
import { fakeBroker, isCiphertextOnly } from '../../../modules/sync/testing/fakeMqttBroker';

vi.mock(
  'mqtt',
  async () => (await import('../../../modules/sync/testing/fakeMqttBroker')).fakeMqttModule,
);

describe('GuessArt mailbox end-to-end encryption (ADR 0009)', () => {
  it('publishes a game snapshot (drawings) as retained ciphertext', async () => {
    fakeBroker.reset();
    ensureRoomKey('ga-game-1', 'local');
    const snapshot = { game: { id: 'ga-game-1', name: 'Alice-drawing' }, round: null };
    await guessArtMailbox.publish('ga-game-1', snapshot as unknown as GameSnapshot);

    const [message] = fakeBroker.on('lgg/ga/ga-game-1');
    expect(isCiphertextOnly(message, ['Alice-drawing', 'ga-game-1'])).toBe(true);
    expect(message.retain).toBe(true);
  });
});
