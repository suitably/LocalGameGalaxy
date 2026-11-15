import { Hono } from 'hono';
import path from 'node:path';
import { streamFile } from '../../../utils/fileStream';
import { savedGamesRoot } from '../services/scanner';
import { ASSET_JOBS, readStoredAsset, storeGameAssets } from '../services/workshopAssets';
import { ensureScanned, parseGameBody, writeGame } from './library';
import { toClientGameEntry } from './games';
import type { HonoEnv } from '../../../core/types';

/**
 * Workshop games in the companion library (#702, maintainer decision 2026-11-15): an imported
 * Workshop game is stored for everyone who uses this companion, with its images, the way the
 * Melodiq plugin stores downloaded songs. The app converts the save (same importer as the
 * browser import) and posts the game; the companion stores it and downloads its images.
 */
export const tabletopWorkshopLibraryRouter = new Hono<HonoEnv>();

const WORKSHOP_ID = /^\d{1,20}$/;

/** Folder of a stored Workshop game; a re-import of the same item overwrites it. */
export const workshopGameFolder = (workshopId: string): string =>
  path.join(savedGamesRoot(), `workshop-${workshopId}`);

// POST /api/tabletop/workshop/:workshopId/import — store a converted Workshop game ({ game })
tabletopWorkshopLibraryRouter.post('/api/tabletop/workshop/:workshopId/import', async (c) => {
  const workshopId = c.req.param('workshopId');
  if (!WORKSHOP_ID.test(workshopId)) return c.json({ error: 'Invalid Workshop id' }, 400);
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const raw = body?.game;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return c.json({ error: 'game must be a JSON object' }, 400);
  }
  // only on this companion, never published elsewhere (D4)
  const game = { ...raw, format: 'tts-workshop', companionPrivate: true, workshopId };
  const parsed = parseGameBody({ game });
  if (typeof parsed === 'string') return c.json({ error: parsed }, 400);
  try {
    ensureScanned();
    const entry = await writeGame(
      path.join(workshopGameFolder(workshopId), 'game.json'),
      parsed.json,
    );
    if (!entry) return c.json({ error: 'Not a recognised tabletop game definition' }, 400);
    // images download in the background; progress via GET .../assets/:gameId
    void storeGameAssets(entry.id, game);
    const assets = ASSET_JOBS.get(entry.id);
    return c.json({ ...toClientGameEntry(entry), assets }, 201);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: `Failed to store Workshop game: ${msg}` }, 500);
  }
});

// GET /api/tabletop/workshop/assets/:gameId — image download progress of a stored game
tabletopWorkshopLibraryRouter.get('/api/tabletop/workshop/assets/:gameId', (c) => {
  const status = ASSET_JOBS.get(c.req.param('gameId'));
  return status ? c.json(status) : c.json({ error: 'No asset job for this game' }, 404);
});

// GET /tabletop/stored-asset?url= — the companion's stored copy of an image (404 if none)
tabletopWorkshopLibraryRouter.get('/tabletop/stored-asset', async (c) => {
  const url = c.req.query('url');
  if (!url) return c.text('Missing url', 400);
  const stored = await readStoredAsset(url);
  if (!stored) return c.text('Not stored', 404);
  c.header('Access-Control-Allow-Origin', '*');
  return streamFile(c, stored.filePath, stored.meta.contentType, 'public, max-age=604800');
});
