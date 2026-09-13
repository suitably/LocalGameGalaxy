import { Hono } from 'hono';
import { getAllPlaylists, savePlaylist, deletePlaylist } from '../services/playlists';
import { serverConfig } from '../../../config';
import type { HonoEnv, Playlist } from '../../../core/types';

export const playlistsRouter = new Hono<HonoEnv>();

const getToken = (c: { req: { header: (k: string) => string | undefined; query: (k: string) => string | undefined } }) => {
  const token = c.req.header('Authorization') || c.req.header('authorization') || c.req.query('token');
  return token?.replace(/^Bearer\s+/i, '');
};

// GET /api/playlists — Get all playlists
playlistsRouter.get('/api/playlists', (c) => {
  const playlists = getAllPlaylists();
  return c.json(playlists);
});

// POST /api/playlists — Save / update a playlist
playlistsRouter.post('/api/playlists', async (c) => {
  const token = getToken(c);
  const body = (await c.req.json().catch(() => ({}))) as Partial<Playlist>;
  const { id, name, songs, creatorToken, updatedAt } = body;

  if (!id || !name || !Array.isArray(songs)) {
    return c.json({ error: 'Invalid playlist payload' }, 400);
  }

  const playlist: Playlist = {
    id,
    name,
    songs,
    creatorToken: creatorToken || token,
    updatedAt: updatedAt || Date.now(),
  };

  savePlaylist(playlist);
  return c.json(playlist);
});

// DELETE /api/playlists/:id — Delete a playlist
playlistsRouter.delete('/api/playlists/:id', (c) => {
  const id = c.req.param('id');
  const token = getToken(c);

  const playlists = getAllPlaylists();
  const playlist = playlists.find((p) => p.id === id);

  if (!playlist) {
    return c.json({ error: 'Playlist not found' }, 404);
  }

  const isMaster = token === serverConfig.token;
  if (!isMaster && playlist.creatorToken !== token) {
    return c.json({ error: 'Not authorized to delete this playlist' }, 403);
  }

  const success = deletePlaylist(id);
  if (success) {
    return c.json({ success: true });
  } else {
    return c.json({ error: 'Failed to delete playlist' }, 500);
  }
});
