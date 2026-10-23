import { createSeatedAssignment } from '../../../modules/player-management';

const STORAGE_PREFIX = 'storyteller_local_players_';

/** `isLocal(game, id)` follows the player's seat; the per-device list is only for old records. */
export const playerAssignment = createSeatedAssignment(STORAGE_PREFIX);
