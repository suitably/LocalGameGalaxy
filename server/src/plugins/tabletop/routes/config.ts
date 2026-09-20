import { Hono } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import { serverConfig } from '../../../config';
import { scanGames } from '../services/scanner';
import type { HonoEnv } from '../../../core/types';

export const tabletopConfigRouter = new Hono<HonoEnv>();

// GET /api/tabletop/config — List configured tabletop directories
tabletopConfigRouter.get('/api/tabletop/config', (c) => {
  return c.json({ directories: serverConfig.tabletopDirectories });
});

// POST /api/tabletop/config/directories — Add directory and trigger scan
tabletopConfigRouter.post('/api/tabletop/config/directories', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const rawPath = typeof body.path === 'string' ? body.path.trim() : '';

  if (!rawPath) {
    return c.json({ error: 'Path is required' }, 400);
  }

  const resolved = path.resolve(rawPath);

  try {
    const stat = await fs.promises.stat(resolved);
    if (!stat.isDirectory()) {
      return c.json({ error: 'Specified path is not a directory' }, 400);
    }
  } catch {
    return c.json({ error: 'Directory does not exist or is not accessible' }, 400);
  }

  serverConfig.addTabletopDirectory(resolved);
  scanGames();
  return c.json({ success: true, directories: serverConfig.tabletopDirectories });
});

// DELETE /api/tabletop/config/directories — Remove directory and trigger scan
tabletopConfigRouter.delete('/api/tabletop/config/directories', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const rawPath = typeof body.path === 'string' ? body.path.trim() : '';

  if (!rawPath) {
    return c.json({ error: 'Path is required' }, 400);
  }

  const resolved = path.resolve(rawPath);
  // Match either exact string or resolved path
  const existing = serverConfig.tabletopDirectories.find(
    (d) => d === rawPath || path.resolve(d) === resolved
  );

  if (existing) {
    serverConfig.removeTabletopDirectory(existing);
  } else {
    serverConfig.removeTabletopDirectory(rawPath);
  }

  scanGames();
  return c.json({ success: true, directories: serverConfig.tabletopDirectories });
});
