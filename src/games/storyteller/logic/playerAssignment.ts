import { createPlayerAssignment } from '../../../lib/utils/turnAssignment';

const STORAGE_PREFIX = 'storyteller_local_players_';

export const playerAssignment = createPlayerAssignment(STORAGE_PREFIX);
