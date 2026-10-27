import { Hono, type Context } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import { serverConfig } from '../../../config';
import { resolveSecurePath } from '../../../utils/helpers';
import {
  getSongCache,
  setSongCache,
  isScanning,
  scanSongs,
  addOrUpdateSongInCache,
} from '../services/scanner';
import type { HonoEnv, Song, ClientSong } from '../../../core/types';
import { getRequestToken } from '../../../core/auth';

export const songsRouter = new Hono<HonoEnv>();

// `token` is the caller's own token; media URLs must never carry the master token.
export const toClientSong = (s: Song, token: string): ClientSong => {
  const secureUrl = (absPath: string | null): string | null => {
    if (!absPath) return null;
    if (absPath.startsWith('http://') || absPath.startsWith('https://')) {
      return absPath;
    }
    return `/media?path=${encodeURIComponent(absPath)}&token=${encodeURIComponent(token)}`;
  };

  const { folderScores, folder, recordings, labels, ...rest } = s;
  void folder;
  return {
    ...rest,
    video: secureUrl(s.video),
    audio: secureUrl(s.audio),
    originalAudio: secureUrl(s.originalAudio),
    instrumentalAudio: secureUrl(s.instrumentalAudio),
    vocalsAudio: secureUrl(s.vocalsAudio),
    hasSeparation: Boolean(s.hasSeparation),
    cover: secureUrl(s.cover),
    background: secureUrl(s.background),
    scores: folderScores.map((score) => ({
      file: score.file,
      url: secureUrl(score.path),
      hasMarks: !!score.marksPath,
      label: labels[score.file] || null,
    })),
    recordings: recordings.map((r) => ({ file: r.file, url: secureUrl(r.path) })),
  };
};

// GET /api/songs — List / search songs with pagination. Songs without a karaoke `.txt` (sheet
// music only, #568) are left out unless `?all=1` (Melodiq Notes) asks for them.
songsRouter.get('/api/songs', async (c) => {
  const page = parseInt(c.req.query('page') || '1', 10) || 1;
  const limit = parseInt(c.req.query('limit') || '10000', 10) || 10000;
  const search = (c.req.query('search') || '').trim().toLowerCase();
  const all = c.req.query('all') === '1';

  let results = all ? getSongCache() : getSongCache().filter((s) => s.karaoke);
  if (search) {
    results = results.filter((s) => s.searchString.includes(search));
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginated = results
    .slice(startIndex, endIndex)
    .map((s) => toClientSong(s, getRequestToken(c) ?? ''));

  c.header('X-Total-Count', String(results.length));
  c.header('X-Page', String(page));
  c.header('X-Limit', String(limit));

  return c.json(paginated);
});

// GET /api/songs/:id — Single song
songsRouter.get('/api/songs/:id', async (c) => {
  const songId = c.req.param('id');
  const song = getSongCache().find((s) => s.id === songId);

  if (!song) {
    return c.json({ error: 'Song not found' }, 404);
  }

  c.header('Cache-Control', 'no-store');
  return c.json(toClientSong(song, getRequestToken(c) ?? ''));
});

// DELETE /api/songs/:id — Delete song + cleanup
songsRouter.delete('/api/songs/:id', async (c) => {
  const isMaster = c.get('isMasterToken');
  const apiKey = c.get('apiKey');

  if (!isMaster && (!apiKey || !apiKey.allowSongDeletion)) {
    return c.json({ error: 'Permission denied: Song deletion not allowed' }, 403);
  }

  const songId = c.req.param('id');
  const song = getSongCache().find((s) => s.id === songId);
  if (!song) return c.json({ error: 'Song not found in cache' }, 404);

  const songFolder = song.folder;
  const safeFolder = resolveSecurePath(songFolder);
  if (!safeFolder) {
    return c.json({ error: 'Access denied or song directory not found' }, 403);
  }

  try {
    const isRootConfigDir = serverConfig.directories.some(
      (dir) => path.normalize(dir) === safeFolder,
    );
    if (isRootConfigDir && !song.txtPath) {
      return c.json({ error: 'A library root is not a song folder' }, 400);
    }
    if (isRootConfigDir) {
      // Root config directory - delete individual files to avoid deleting the library root folder
      if (fs.existsSync(song.txtPath)) await fs.promises.unlink(song.txtPath);
      if (song.audio && fs.existsSync(song.audio)) await fs.promises.unlink(song.audio);
      if (song.video && fs.existsSync(song.video)) await fs.promises.unlink(song.video);
      if (song.cover && fs.existsSync(song.cover)) await fs.promises.unlink(song.cover);
      if (song.background && fs.existsSync(song.background))
        await fs.promises.unlink(song.background);
    } else {
      // Delete the full song directory
      await fs.promises.rm(safeFolder, { recursive: true, force: true });
    }

    // Immediately remove deleted song from in-memory cache
    setSongCache(getSongCache().filter((s) => s.id !== songId));

    return c.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: `Failed to delete song: ${msg}` }, 500);
  }
});

// PUT /api/songs/:id/txt — Update lyrics
songsRouter.put('/api/songs/:id/txt', async (c) => {
  const songId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const { txtContent } = body as { txtContent?: string };

  if (!txtContent) return c.json({ error: 'Missing txtContent' }, 400);

  const song = getSongCache().find((s) => s.id === songId);
  if (!song) return c.json({ error: 'Song not found in cache' }, 404);
  if (!song.txtPath) return c.json({ error: 'Song does not have a text path' }, 400);

  const safePath = resolveSecurePath(song.txtPath);
  if (!safePath) {
    return c.json({ error: 'Access denied or song file not found' }, 403);
  }

  try {
    await fs.promises.writeFile(safePath, txtContent, 'utf-8');
    await addOrUpdateSongInCache(safePath);
    return c.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: `Failed to save song file: ${msg}` }, 500);
  }
});

// POST /api/songs/:id/video — Upload video file
songsRouter.post('/api/songs/:id/video', async (c) => {
  const songId = c.req.param('id');
  const song = getSongCache().find((s) => s.id === songId);
  if (!song || !song.txtPath) return c.json({ error: 'Song not found' }, 404);

  const songDir = path.dirname(song.txtPath);
  const safeFolder = resolveSecurePath(songDir);
  if (!safeFolder) return c.json({ error: 'Access denied' }, 403);

  try {
    const body = await c.req.parseBody();
    const uploadedFile = body['video'];

    if (!uploadedFile || typeof uploadedFile === 'string') {
      return c.json({ error: 'No video file uploaded' }, 400);
    }

    const txtFilename = path.basename(song.txtPath);
    const safeName = txtFilename.substring(0, txtFilename.lastIndexOf('.'));
    const originalName = uploadedFile instanceof File ? uploadedFile.name : 'video.mp4';
    const ext = path.extname(originalName) || '.mp4';
    const videoFilename = `${safeName}${ext}`;
    const targetPath = path.join(safeFolder, videoFilename);

    let buffer: Buffer;
    if (uploadedFile instanceof File) {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      return c.json({ error: 'Invalid file upload payload' }, 400);
    }

    await fs.promises.writeFile(targetPath, buffer);

    // Patch .txt file
    const txtContent = await fs.promises.readFile(song.txtPath, 'utf-8');
    let lines = txtContent.split('\n');
    lines = lines.filter((l) => !l.match(/^#VIDEO:/i));

    let insertIdx = lines.findIndex((l) => l.match(/^#MP3:/i));
    if (insertIdx === -1) insertIdx = lines.findIndex((l) => l.match(/^#TITLE:/i));
    if (insertIdx === -1) insertIdx = 0;

    lines.splice(insertIdx + 1, 0, `#VIDEO:${videoFilename}`);
    await fs.promises.writeFile(song.txtPath, lines.join('\n'), 'utf-8');

    scanSongs();
    return c.json({ success: true, video: videoFilename });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: `Failed to update song video: ${msg}` }, 500);
  }
});

// POST /api/songs/refresh — Trigger rescan
songsRouter.post('/api/songs/refresh', (c) => {
  if (isScanning()) return c.json({ error: 'Scan already in progress' }, 409);
  scanSongs();
  return c.json({ message: 'Scan started' });
});

// GET /api/status & GET /api/auth/me — Server scan status & capability check
const getScanStatusHandler = (c: Context<HonoEnv>) => {
  const isMaster = c.get('isMasterToken');
  const apiKey = c.get('apiKey');
  const isAdmin = Boolean(isMaster || (apiKey && apiKey.allowManagement));
  const allowSongDeletion = Boolean(isMaster || (apiKey && apiKey.allowSongDeletion));

  return c.json({
    scanning: isScanning(),
    count: getSongCache().length,
    authenticated: true,
    isAdmin,
    allowManagement: isAdmin,
    allowSongDeletion,
    role: isAdmin ? 'admin' : 'guest',
    name: apiKey ? apiKey.name : 'Master',
  });
};

songsRouter.get('/api/status', getScanStatusHandler);
songsRouter.get('/api/auth/me', getScanStatusHandler);
