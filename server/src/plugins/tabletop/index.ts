import type { GalaxyPlugin } from '../../core/types';
import { tabletopGamesRouter } from './routes/games';
import { tabletopMediaRouter } from './routes/media';
import { tabletopConfigRouter } from './routes/config';
import { scanGames } from './services/scanner';

export const tabletopPlugin: GalaxyPlugin = {
  id: 'tabletop',
  name: 'Tabletop BYOG Server',
  version: '1.0.0',
  description: 'Bring Your Own Games — scans local directories and streams assets',
  init: (app) => {
    // Mount routes
    app.route('/', tabletopGamesRouter);
    app.route('/', tabletopMediaRouter);
    app.route('/', tabletopConfigRouter);
    // Initial scan
    scanGames();
  },
};
