import { Hono, type Context } from 'hono';
import { getRequester, hasPermission } from '../../../core/auth';
import { getGameCache } from '../services/scanner';
import {
  deleteSave,
  deleteTemplate,
  getSave,
  listSaves,
  normalizeSaveName,
  suggestFreeName,
  writeSave,
  writeTemplate,
  type TabletopSaveMeta,
} from '../services/saveStore';
import { parseGameBody } from './library';
import type { HonoEnv } from '../../../core/types';

/**
 * Named table states (save games) and default templates.
 *
 * Every token may list and load saves (also other users'); storing one needs
 * `allowTabletopSaves`, and only its owner may overwrite or delete it. Replacing a game's
 * default template needs `allowTabletopTemplates`.
 */
export const tabletopSavesRouter = new Hono<HonoEnv>();

const MAX_NAME_LENGTH = 120;
const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

const permissionsOf = (c: Context<HonoEnv>) => ({
  saveStates: hasPermission(c, 'allowTabletopSaves'),
  saveTemplates: hasPermission(c, 'allowTabletopTemplates'),
});

const toClient = (c: Context<HonoEnv>, save: TabletopSaveMeta) => ({
  ...save,
  mine: save.ownerId === getRequester(c).id,
});

interface SaveBody {
  name: string;
  gameId: string;
  json: string;
}

/** Validates `{ name, gameId, game }`; returns an error text on failure. */
function parseSaveBody(body: unknown): SaveBody | string {
  const parsed = parseGameBody(body);
  if (typeof parsed === 'string') return parsed;
  const b = body as Record<string, unknown>;
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  if (!name) return 'name is required';
  if (name.length > MAX_NAME_LENGTH) return 'name is too long';
  const gameId = typeof b.gameId === 'string' ? b.gameId.trim() : '';
  if (!gameId || gameId.length > 200) return 'gameId is required';
  return { name, gameId, json: parsed.json };
}

/** 409 with a free alternative when another save of this game already uses the name. */
async function nameConflict(c: Context<HonoEnv>, save: SaveBody, exceptId?: string) {
  const others = (await listSaves(save.gameId)).filter((s) => s.id !== exceptId);
  const wanted = normalizeSaveName(save.name);
  if (!others.some((s) => normalizeSaveName(s.name) === wanted)) return null;
  const suggestion = suggestFreeName(
    save.name,
    others.map((s) => s.name),
  );
  return c.json({ error: 'A save with this name already exists', suggestion }, 409);
}

// GET /api/tabletop/saves?gameId= — saves of all users, newest first, plus the caller's rights
tabletopSavesRouter.get('/api/tabletop/saves', async (c) => {
  const saves = await listSaves(c.req.query('gameId') || undefined);
  return c.json({ saves: saves.map((s) => toClient(c, s)), permissions: permissionsOf(c) });
});

// GET /api/tabletop/saves/:id — one save with its game state
tabletopSavesRouter.get('/api/tabletop/saves/:id', async (c) => {
  const save = await getSave(c.req.param('id'));
  if (!save) return c.json({ error: 'Save not found' }, 404);
  return c.json({ ...toClient(c, save), game: save.game });
});

// POST /api/tabletop/saves — store a new save ({ name, gameId, game })
tabletopSavesRouter.post('/api/tabletop/saves', async (c) => {
  if (!permissionsOf(c).saveStates) {
    return c.json({ error: 'Permission denied: saving table states not allowed' }, 403);
  }
  const body = parseSaveBody(await c.req.json().catch(() => null));
  if (typeof body === 'string') return c.json({ error: body }, 400);
  const conflict = await nameConflict(c, body);
  if (conflict) return conflict;
  try {
    const owner = getRequester(c);
    const meta = await writeSave(
      { gameId: body.gameId, name: body.name, ownerId: owner.id, ownerName: owner.name },
      JSON.parse(body.json),
    );
    return c.json(toClient(c, meta), 201);
  } catch (e: unknown) {
    return c.json({ error: `Failed to save table state: ${errorText(e)}` }, 500);
  }
});

// PUT /api/tabletop/saves/:id — overwrite (or rename) one's own save
tabletopSavesRouter.put('/api/tabletop/saves/:id', async (c) => {
  if (!permissionsOf(c).saveStates) {
    return c.json({ error: 'Permission denied: saving table states not allowed' }, 403);
  }
  const existing = await getSave(c.req.param('id'));
  if (!existing) return c.json({ error: 'Save not found' }, 404);
  const owner = getRequester(c);
  if (existing.ownerId !== owner.id) {
    return c.json({ error: 'Permission denied: this save belongs to another user' }, 403);
  }
  const body = parseSaveBody(await c.req.json().catch(() => null));
  if (typeof body === 'string') return c.json({ error: body }, 400);
  const conflict = await nameConflict(c, body, existing.id);
  if (conflict) return conflict;
  try {
    const meta = await writeSave(
      {
        id: existing.id,
        gameId: body.gameId,
        name: body.name,
        ownerId: owner.id,
        ownerName: owner.name,
      },
      JSON.parse(body.json),
    );
    return c.json(toClient(c, meta));
  } catch (e: unknown) {
    return c.json({ error: `Failed to save table state: ${errorText(e)}` }, 500);
  }
});

// DELETE /api/tabletop/saves/:id — owner (or master token) only
tabletopSavesRouter.delete('/api/tabletop/saves/:id', async (c) => {
  const existing = await getSave(c.req.param('id'));
  if (!existing) return c.json({ error: 'Save not found' }, 404);
  if (existing.ownerId !== getRequester(c).id && !c.get('isMasterToken')) {
    return c.json({ error: 'Permission denied: this save belongs to another user' }, 403);
  }
  await deleteSave(existing.id);
  return c.json({ success: true });
});

const templateGuard = (c: Context<HonoEnv>) => {
  if (!permissionsOf(c).saveTemplates) {
    return c.json({ error: 'Permission denied: changing game templates not allowed' }, 403);
  }
  if (!getGameCache().some((g) => g.id === c.req.param('id'))) {
    return c.json({ error: 'Game not found' }, 404);
  }
  return null;
};

// PUT /api/tabletop/games/:id/template — new default start state of a game ({ game })
tabletopSavesRouter.put('/api/tabletop/games/:id/template', async (c) => {
  const denied = templateGuard(c);
  if (denied) return denied;
  const parsed = parseGameBody(await c.req.json().catch(() => null));
  if (typeof parsed === 'string') return c.json({ error: parsed }, 400);
  try {
    await writeTemplate(c.req.param('id'), parsed.json);
    return c.json({ success: true });
  } catch (e: unknown) {
    return c.json({ error: `Failed to save template: ${errorText(e)}` }, 500);
  }
});

// DELETE /api/tabletop/games/:id/template — back to the game's original definition
tabletopSavesRouter.delete('/api/tabletop/games/:id/template', async (c) => {
  const denied = templateGuard(c);
  if (denied) return denied;
  const removed = await deleteTemplate(c.req.param('id'));
  return removed ? c.json({ success: true }) : c.json({ error: 'No template stored' }, 404);
});
