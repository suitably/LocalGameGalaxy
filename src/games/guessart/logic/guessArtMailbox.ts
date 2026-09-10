import { MqttMailboxService } from '../../../modules/sync/MqttMailboxService';
import type { GameSnapshot } from './types';

export const guessArtMailbox = new MqttMailboxService<GameSnapshot>({
  topicPrefix: 'lgg/ga',
});
