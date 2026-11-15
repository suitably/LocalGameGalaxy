import { createSeatedAssignment } from '../../../modules/player-management';
import { STORAGE_PREFIXES } from '../../../lib/storage';

/** `isLocal(game, id)` follows the player's seat; the per-device list is only for old records. */
export const playerAssignment = createSeatedAssignment(STORAGE_PREFIXES.STORYTELLER_LOCAL_PLAYERS);
