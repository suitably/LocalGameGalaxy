import { MqttMailboxService } from '../../../modules/sync/MqttMailboxService';
import type { PartySyncEnvelope } from './universalPartyManager';

export const partyMailbox = new MqttMailboxService<PartySyncEnvelope>({
  topicPrefix: 'lgg/party',
});
