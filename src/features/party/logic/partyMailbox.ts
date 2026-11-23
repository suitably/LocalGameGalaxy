import { MqttMailboxService } from '../../../modules/sync/MqttMailboxService';
import { getRoomKey } from '../../../modules/sync/roomKeys';
import type { PartySyncEnvelope } from './universalPartyManager';

const CHANNEL_PREFIX = 'party_';

export const partyMailbox = new MqttMailboxService<PartySyncEnvelope>({
  topicPrefix: 'lgg/party',
  // Channel `party_<room>`: the room's key from the invite link (ADR 0009).
  keyFor: (channelId) =>
    channelId.startsWith(CHANNEL_PREFIX)
      ? getRoomKey(channelId.slice(CHANNEL_PREFIX.length))
      : null,
  // A late joiner needs the last room state; presence pings are live traffic.
  retain: (payload) => payload.type !== 'PARTY_PRESENCE',
});
