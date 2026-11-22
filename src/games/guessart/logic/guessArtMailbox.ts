import { MqttMailboxService } from '../../../modules/sync/MqttMailboxService';
import type { GameSnapshot } from './types';

export const guessArtMailbox = new MqttMailboxService<GameSnapshot>({
  topicPrefix: 'lgg/ga',
  // Channel = game id, key per game (`roomKeys.ts`); a short link loads the last snapshot.
  retain: () => true,
});
