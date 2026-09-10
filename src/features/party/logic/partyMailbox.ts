import { MqttMailboxService } from '../../../modules/sync/MqttMailboxService';

export const partyMailbox = new MqttMailboxService<unknown>({
  topicPrefix: 'lgg/party',
});
