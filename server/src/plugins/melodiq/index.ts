import type { Hono } from 'hono';
import type { GalaxyPlugin, HonoEnv, ServerConfig } from '../../core/types';
import { requireAuth } from './middleware/auth';
import { songsRouter } from './routes/songs';
import { mediaRouter } from './routes/media';
import { usdbRouter } from './routes/usdb';
import { separatorRouter } from './routes/separator';
import { configRouter } from './routes/config';
import { playlistsRouter } from './routes/playlists';
import { scanSongs } from './services/scanner';

export const melodiqPlugin: GalaxyPlugin = {
  id: 'melodiq',
  name: 'Melodiq Karaoke Media Server',
  version: '2.0.0',
  description: 'Song library scanner, metadata reader, USDB downloads, stem separation, and audio streaming for Melodiq',

  init(app: Hono<HonoEnv>, _config: ServerConfig) {
    // Root info endpoint (matches Express GET /)
    app.get('/', (c) =>
      c.json({
        name: 'MelodiQ Server',
        version: '2.0.0',
        status: 'running',
      })
    );

    // Mount Melodiq Auth Middleware
    const melodiqAuthPaths = [
      '/api/songs',
      '/api/songs/*',
      '/api/status',
      '/api/auth/me',
      '/media',
      '/api/usdb/*',
      '/api/youtube/*',
      '/api/separator/*',
      '/api/config/*',
      '/api/playlists',
      '/api/playlists/*',
      '/api/browse',
      '/api/feedback',
    ];

    for (const p of melodiqAuthPaths) {
      app.use(p, requireAuth);
    }

    // Mount sub-routers
    app.route('/', songsRouter);
    app.route('/', mediaRouter);
    app.route('/', usdbRouter);
    app.route('/', separatorRouter);
    app.route('/', configRouter);
    app.route('/', playlistsRouter);

    // Initial song library scan
    scanSongs();
  },
};
