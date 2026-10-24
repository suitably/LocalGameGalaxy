import { Hono, type Context } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import { serverConfig } from '../../../config';
import { cleanUploadName } from '../../../utils/scoreFiles';
import {
  getGameCache,
  isSavedGame,
  parseGameFile,
  removeGameFromCache,
  savedGamesRoot,
  upsertGameInCache,
} from '../services/scanner';
import { toClientGameEntry as toClient } from './games';
import type { HonoEnv, TabletopGameEntry } from '../../../core/types';

/** Save, overwrite and delete games from the client (see `savedGamesRoot`). */
export const tabletopLibraryRouter = new Hono<HonoEnv>();

export const MAX_GAME_BYTES = 50 * 1024 * 1024;

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Reads `{ game }` (object) or `{ rawJson }` (string); returns the JSON text or an error message. */
export function parseGameBody(body: unknown): { json: string; name: string } | string {
  if (!body || typeof body !== 'object') return 'Body must be a JSON object';
  const b = body as Record<string, unknown>;
  let game: unknown = b.game;
  if (typeof b.rawJson === 'string') {
    try {
      game = JSON.parse(b.rawJson);
    } catch {
      return 'rawJson is not valid JSON';
    }
  }
  if (!game || typeof game !== 'object' || Array.isArray(game)) return 'game must be a JSON object';
  const json = JSON.stringify(game, null, 2);
  if (Buffer.byteLength(json) > MAX_GAME_BYTES) return 'Game is too large';
  const g = game as Record<string, unknown>;
  const rawName = [b.name, g.name, g.SaveName].find((v) => typeof v === 'string' && v.trim());
  return { json, name: (rawName as string | undefined)?.trim() || 'Game' };
}

/** Writes the JSON and indexes it; a file the scanner does not recognise as a game is removed again. */
async function writeGame(jsonPath: string, json: string): Promise<TabletopGameEntry | null> {
  await fs.promises.mkdir(path.dirname(jsonPath), { recursive: true });
  await fs.promises.writeFile(jsonPath, json, 'utf-8');
  const entry = await parseGameFile(jsonPath);
  if (entry) upsertGameInCache(entry);
  return entry;
}

function ensureScanned(): void {
  // a save folder that is not configured yet becomes the first tabletop directory
  if (serverConfig.tabletopDirectories.length === 0) {
    fs.mkdirSync(serverConfig.tabletopSaveRoot, { recursive: true });
    serverConfig.addTabletopDirectory(path.resolve(serverConfig.tabletopSaveRoot));
  }
}

function savedEntry(c: Context<HonoEnv>): TabletopGameEntry | Response {
  const entry = getGameCache().find((g) => g.id === c.req.param('id'));
  if (!entry) return c.json({ error: 'Game not found' }, 404);
  if (!isSavedGame(entry))
    return c.json({ error: 'Only games saved via the API can be changed' }, 403);
  return entry;
}

// POST /api/tabletop/games — save a new game ({ game } or { rawJson }, optional { name })
tabletopLibraryRouter.post('/api/tabletop/games', async (c) => {
  const parsed = parseGameBody(await c.req.json().catch(() => null));
  if (typeof parsed === 'string') return c.json({ error: parsed }, 400);
  try {
    ensureScanned();
    const base = cleanUploadName(parsed.name.replace(/[/\\]/g, '_')).replace(/\.+$/, '') || 'Game';
    let folder = path.join(savedGamesRoot(), base);
    for (let i = 2; fs.existsSync(folder); i++)
      folder = path.join(savedGamesRoot(), `${base} (${i})`);
    const entry = await writeGame(path.join(folder, 'game.json'), parsed.json);
    if (!entry) {
      await fs.promises.rm(folder, { recursive: true, force: true });
      return c.json({ error: 'Not a recognised tabletop game definition' }, 400);
    }
    return c.json(toClient(entry), 201);
  } catch (e: unknown) {
    return c.json({ error: `Failed to save game: ${errorText(e)}` }, 500);
  }
});

// PUT /api/tabletop/games/:id — overwrite a saved game
tabletopLibraryRouter.put('/api/tabletop/games/:id', async (c) => {
  const entry = savedEntry(c);
  if (entry instanceof Response) return entry;
  const parsed = parseGameBody(await c.req.json().catch(() => null));
  if (typeof parsed === 'string') return c.json({ error: parsed }, 400);
  const previous = await fs.promises.readFile(entry.jsonPath, 'utf-8').catch(() => null);
  try {
    const updated = await writeGame(entry.jsonPath, parsed.json);
    if (!updated) {
      if (previous !== null) await writeGame(entry.jsonPath, previous);
      return c.json({ error: 'Not a recognised tabletop game definition' }, 400);
    }
    return c.json(toClient(updated));
  } catch (e: unknown) {
    return c.json({ error: `Failed to save game: ${errorText(e)}` }, 500);
  }
});

// DELETE /api/tabletop/games/:id — remove a saved game with its folder
tabletopLibraryRouter.delete('/api/tabletop/games/:id', async (c) => {
  if (!c.get('isMasterToken') && !c.get('apiKey')?.allowSongDeletion) {
    return c.json({ error: 'Permission denied: deletion not allowed' }, 403);
  }
  const entry = savedEntry(c);
  if (entry instanceof Response) return entry;
  try {
    // a game saved via the API owns its folder; a file dropped straight into saved/ does not
    const folder = path.dirname(entry.jsonPath);
    const ownsFolder = path.resolve(folder) !== path.resolve(savedGamesRoot());
    await fs.promises.rm(ownsFolder ? folder : entry.jsonPath, { recursive: true, force: true });
    removeGameFromCache(entry.id);
    return c.json({ success: true });
  } catch (e: unknown) {
    return c.json({ error: `Failed to delete game: ${errorText(e)}` }, 500);
  }
});
