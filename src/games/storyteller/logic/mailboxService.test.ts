import { describe, it, expect, vi } from 'vitest';
import { storytellerMailboxService, type StorytellerSyncMessage } from './mailboxService';
import { ensureRoomKey } from '../../../modules/sync/roomKeys';
import { fakeBroker, isCiphertextOnly } from '../../../modules/sync/testing/fakeMqttBroker';

vi.mock(
  'mqtt',
  async () => (await import('../../../modules/sync/testing/fakeMqttBroker')).fakeMqttModule,
);

describe('Storyteller mailbox end-to-end encryption (ADR 0009)', () => {
  it('publishes the story snapshot as retained ciphertext', async () => {
    fakeBroker.reset();
    ensureRoomKey('story-1', 'local');
    const message = {
      type: 'STORY_SYNC',
      snapshot: { game: { id: 'story-1', lines: ['Once upon a Bob-secret'] } },
    } as unknown as StorytellerSyncMessage;
    await storytellerMailboxService.publish('story-1', message);

    const [wire] = fakeBroker.on('lgg/storyteller/v1/story-1');
    expect(isCiphertextOnly(wire, ['Bob-secret', 'STORY_SYNC'])).toBe(true);
    expect(wire.retain).toBe(true);
  });
});
