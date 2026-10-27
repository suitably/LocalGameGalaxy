import type { GalaxyPlugin } from '../../core/types';
import { serverConfig } from '../../config';

/**
 * Melodiq Notes keeps its sheet music, marks and recordings in song folders (#568, routes in the
 * Melodiq plugin). The old Notes library (`NOTES_DIR`) is no longer served.
 */
export const notesPlugin: GalaxyPlugin = {
  id: 'notes',
  name: 'Melodiq Notes Library',
  version: '2.0.0',
  description: 'Old Melodiq Notes library folder (NOTES_DIR)',
  init: () => {
    console.log(`[Notes] Old library folder: ${serverConfig.notesDir}`);
  },
};
