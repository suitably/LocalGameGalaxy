import type { Hono } from 'hono';
import type { GalaxyPlugin, ServerConfig } from '../../core/types';
import fs from 'fs';
import path from 'path';

export const melodiqPlugin: GalaxyPlugin = {
  id: 'melodiq',
  name: 'Melodiq Karaoke Media Server',
  version: '1.0.0',
  description: 'Song library scanner, metadata reader, and audio streaming for Melodiq',

  init(app: Hono, config: ServerConfig) {
    const musicDir = config.musicDir || path.join(process.cwd(), 'music');

    // List songs
    app.get('/api/melodiq/songs', (c) => {
      if (!fs.existsSync(musicDir)) {
        return c.json({ songs: [], total: 0 });
      }

      try {
        const files = fs.readdirSync(musicDir);
        const songs = files
          .filter((f) => /\.(mp3|flac|ogg|m4a|wav)$/i.test(f))
          .map((filename) => ({
            id: Buffer.from(filename).toString('hex'),
            filename,
            title: path.parse(filename).name,
            format: path.extname(filename).slice(1),
          }));

        return c.json({ songs, total: songs.length });
      } catch (e) {
        return c.json({ error: 'Failed to scan music directory' }, 500);
      }
    });

    // Stream song audio
    app.get('/api/melodiq/stream/:id', (c) => {
      const id = c.req.param('id');
      try {
        const filename = Buffer.from(id, 'hex').toString('utf8');
        const safePath = path.join(musicDir, path.basename(filename));

        if (!fs.existsSync(safePath)) {
          return c.text('Not found', 404);
        }

        const stat = fs.statSync(safePath);
        const stream = fs.createReadStream(safePath);

        return c.body(stream as any, 200, {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(stat.size),
          'Accept-Ranges': 'bytes',
        });
      } catch {
        return c.text('Invalid song ID', 400);
      }
    });
  },
};
