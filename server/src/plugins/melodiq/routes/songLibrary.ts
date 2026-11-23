import { Hono, type Context } from 'hono';
import { getRequester } from '../../../core/auth';
import {
  createPlaylist,
  deletePlaylist,
  getFavorites,
  getPlaylist,
  listVisiblePlaylists,
  parsePlaylistName,
  parseSongIds,
  setFavorites,
  updatePlaylist,
  type StoredPlaylist,
} from '../services/songLibrary';
import type { HonoEnv } from '../../../core/types';

/**
 * Song library per API user (#636, ADR-0010): favourites and playlists. A playlist is edited by its
 * owner only; others see it read-only while it is `shared`, and not at all otherwise.
 */
export const songLibraryRouter = new Hono<HonoEnv>();

const BASE = '/api/melodiq/library';

const view = (c: Context<HonoEnv>, p: StoredPlaylist) => {
  const { ownerId, ...rest } = p;
  return { ...rest, mine: ownerId === getRequester(c).id };
};

const readBody = async (c: Context<HonoEnv>): Promise<Record<string, unknown>> => {
  const body: unknown = await c.req.json().catch(() => null);
  return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
};

songLibraryRouter.get(`${BASE}/favorites`, (c) =>
  c.json({ songIds: getFavorites(getRequester(c).id) }),
);

songLibraryRouter.put(`${BASE}/favorites`, async (c) => {
  const songIds = parseSongIds((await readBody(c)).songIds);
  if (!songIds) return c.json({ error: 'songIds must be an array' }, 400);
  return c.json({ songIds: setFavorites(getRequester(c).id, songIds) });
});

songLibraryRouter.get(`${BASE}/playlists`, (c) =>
  c.json(listVisiblePlaylists(getRequester(c).id).map((p) => view(c, p))),
);

songLibraryRouter.post(`${BASE}/playlists`, async (c) => {
  const body = await readBody(c);
  const name = parsePlaylistName(body.name);
  if (!name) return c.json({ error: 'name is required' }, 400);
  const playlist = createPlaylist(getRequester(c), {
    name,
    songs: parseSongIds(body.songs) ?? [],
    shared: body.shared === true,
  });
  return c.json(view(c, playlist), 201);
});

/** The playlist if the requester may see it (owner, or shared); `owned` tells whether they own it. */
const findVisible = (c: Context<HonoEnv>) => {
  const playlist = getPlaylist(c.req.param('id') ?? '');
  const owned = playlist?.ownerId === getRequester(c).id;
  return playlist && (owned || playlist.shared) ? { playlist, owned } : null;
};

songLibraryRouter.put(`${BASE}/playlists/:id`, async (c) => {
  const found = findVisible(c);
  if (!found) return c.json({ error: 'Playlist not found' }, 404);
  if (!found.owned) return c.json({ error: 'Only the owner can change this playlist' }, 403);
  const body = await readBody(c);
  const patch: Partial<Pick<StoredPlaylist, 'name' | 'songs' | 'shared'>> = {};
  if (body.name !== undefined) {
    const name = parsePlaylistName(body.name);
    if (!name) return c.json({ error: 'name must not be empty' }, 400);
    patch.name = name;
  }
  if (body.songs !== undefined) {
    const songs = parseSongIds(body.songs);
    if (!songs) return c.json({ error: 'songs must be an array' }, 400);
    patch.songs = songs;
  }
  if (typeof body.shared === 'boolean') patch.shared = body.shared;
  const updated = updatePlaylist(found.playlist.id, patch);
  return updated ? c.json(view(c, updated)) : c.json({ error: 'Playlist not found' }, 404);
});

songLibraryRouter.delete(`${BASE}/playlists/:id`, (c) => {
  const found = findVisible(c);
  if (!found) return c.json({ error: 'Playlist not found' }, 404);
  if (!found.owned && !c.get('isMasterToken')) {
    return c.json({ error: 'Only the owner can delete this playlist' }, 403);
  }
  deletePlaylist(found.playlist.id);
  return c.json({ success: true });
});
