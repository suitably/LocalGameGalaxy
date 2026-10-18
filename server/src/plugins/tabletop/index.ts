import type { GalaxyPlugin } from '../../core/types';
import { requireAuth, requireMasterToken } from '../../core/auth';
import { tabletopGamesRouter } from './routes/games';
import { tabletopMediaRouter } from './routes/media';
import { tabletopConfigRouter } from './routes/config';
import { tabletopWorkshopRouter } from './routes/workshop';
import { scanGames } from './services/scanner';

export const tabletopPlugin: GalaxyPlugin = {
  id: 'tabletop',
  name: 'Tabletop BYOG Server',
  version: '1.0.0',
  description: 'Bring Your Own Games — scans local directories and streams assets',
  init: (app) => {
    // Every tabletop route needs a valid token; changing directories needs management rights.
    // /tabletop/proxy-image checks its token itself.
    app.use('/api/tabletop/*', requireAuth);
    app.use('/tabletop/media', requireAuth);
    app.use('/api/tabletop/config/*', requireMasterToken);

    // Mount routes
    app.route('/', tabletopGamesRouter);
    app.route('/', tabletopMediaRouter);
    app.route('/', tabletopConfigRouter);
    app.route('/', tabletopWorkshopRouter);
    // Initial scan
    scanGames();
  },
};
