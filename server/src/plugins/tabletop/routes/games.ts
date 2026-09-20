import { Hono } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { serverConfig } from '../../../config';
import { cloudflareTunnel } from '../../../core/tunnel';
import { getLocalIp } from '../../../utils/helpers';
import { getGameCache, isScanning, scanGames } from '../services/scanner';
import type {
  HonoEnv,
  TabletopGameEntry,
  ClientTabletopGameEntry,
  TabletopRawResponse,
} from '../../../core/types';

export const tabletopGamesRouter = new Hono<HonoEnv>();

const toClientGameEntry = (entry: TabletopGameEntry): ClientTabletopGameEntry => {
  const { jsonPath: _jsonPath, assetsDir: _assetsDir, ...clientSafe } = entry;
  return clientSafe;
};

// GET /api/tabletop/games — Client-safe game listing
tabletopGamesRouter.get('/api/tabletop/games', (c) => {
  const games = getGameCache().map(toClientGameEntry);
  return c.json(games);
});

// GET /api/tabletop/games/:id/raw — Raw unnormalized JSON + mapped asset URLs
tabletopGamesRouter.get('/api/tabletop/games/:id/raw', async (c) => {
  const gameId = c.req.param('id');
  const entry = getGameCache().find((g) => g.id === gameId);

  if (!entry) {
    return c.json({ error: 'Game not found' }, 404);
  }

  let rawJson: string;
  try {
    rawJson = await fs.promises.readFile(entry.jsonPath, 'utf-8');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: `Failed to read game file: ${msg}` }, 500);
  }

  const tunnelUrl = cloudflareTunnel.getUrl();
  const localIp = getLocalIp();
  const publicUrl = tunnelUrl ?? `http://${localIp}:${serverConfig.port}`;
  const token = serverConfig.token || '';

  const assetMap: Record<string, string> = {};

  if (entry.assetsDir && fs.existsSync(entry.assetsDir)) {
    try {
      const assetFiles = await fg('**/*', {
        cwd: entry.assetsDir,
        absolute: true,
        onlyFiles: true,
      });

      for (const absPath of assetFiles) {
        const fileName = path.basename(absPath);
        const relToAssets = path.relative(entry.assetsDir, absPath).replace(/\\/g, '/');
        const url = `${publicUrl}/tabletop/media?path=${encodeURIComponent(absPath)}&token=${token}`;

        assetMap[`/assets/${fileName}`] = url;
        assetMap[`assets/${fileName}`] = url;
        assetMap[fileName] = url;

        if (relToAssets !== fileName) {
          assetMap[`/assets/${relToAssets}`] = url;
          assetMap[`assets/${relToAssets}`] = url;
          assetMap[relToAssets] = url;
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[TabletopGames] Error reading assets for game ${entry.id}:`, msg);
    }
  }

  const response: TabletopRawResponse = {
    id: entry.id,
    rawJson,
    assetMap,
  };

  return c.json(response);
});

// GET /api/tabletop/status — Scanner & server status
tabletopGamesRouter.get('/api/tabletop/status', (c) => {
  const localIp = getLocalIp();
  return c.json({
    scanning: isScanning(),
    gameCount: getGameCache().length,
    publicUrl: cloudflareTunnel.getUrl(),
    localUrl: `http://${localIp}:${serverConfig.port}`,
  });
});

// POST /api/tabletop/games/refresh — Trigger rescan
tabletopGamesRouter.post('/api/tabletop/games/refresh', (c) => {
  if (isScanning()) {
    return c.json({ error: 'Scan already in progress' }, 409);
  }
  scanGames();
  return c.json({ message: 'Scan started' });
});
