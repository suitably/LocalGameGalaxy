/**
 * Storyteller Mailbox Service [ID: STORYTELLER-MAILBOX]
 *
 * Dedicated MQTT synchronization for Storyteller using the shared MqttMailboxService.
 * Completely decoupled from GuessArt.
 */

import { MqttMailboxService } from '../../../modules/sync';
import type { StoryGameSnapshot } from '../types';

export interface StorytellerSyncMessage {
  type: 'STORY_SYNC' | 'STORY_FINISH';
  snapshot: StoryGameSnapshot;
}

export const storytellerMailboxService = new MqttMailboxService<StorytellerSyncMessage>({
  topicPrefix: 'lgg/storyteller/v1',
  clientPrefix: 'lgg_story',
});
