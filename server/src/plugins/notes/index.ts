import type { GalaxyPlugin } from '../../core/types';
import { serverConfig } from '../../config';

/**
 * Melodiq Notes keeps its sheet music, marks and recordings in song folders (#568); the Melodiq
 * plugin serves them and moves the old Notes library (`NOTES_DIR`) into song folders once. The
 * plugin id stays so existing `PLUGINS` settings keep working.
 */
export const notesPlugin: GalaxyPlugin = {
  id: 'notes',
  name: 'Melodiq Notes Library',
  version: '2.0.0',
  description: 'Old Melodiq Notes library folder (NOTES_DIR), moved into song folders on startup',
  init: () => {
    console.log(`[Notes] Old library folder (migration source): ${serverConfig.notesDir}`);
  },
};
