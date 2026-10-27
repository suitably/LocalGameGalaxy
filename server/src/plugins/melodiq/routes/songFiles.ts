import { Hono, type Context } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import { getRequestToken } from '../../../core/auth';
import { resolveSecurePath } from '../../../utils/helpers';
import {
  MAX_SCORE_BYTES,
  SCORE_EXTENSIONS,
  marksPathFor,
  parseMarksBody,
  uniqueFileName,
} from '../../../utils/scoreFiles';
import { getSongCache, refreshSongFolder } from '../services/scanner';
import {
  MAX_RECORDING_BYTES,
  RECORDING_EXTENSIONS,
  classifyUpload,
  createSongFolder,
  mergeSongMeta,
  parseSongMetaBody,
  readSongMeta,
  songCreationRoot,
  writeSongMeta,
  type SongMeta,
} from '../services/songFolder';
import { toClientSong } from './songs';
import type { HonoEnv, Song } from '../../../core/types';

/**
 * Song-folder library routes (#568): the song folder is the only store for Melodiq and Melodiq
 * Notes. They replace `/api/notes/pieces…` and the earlier `/api/songs/:id/scores` routes.
 */
export const songFilesRouter = new Hono<HonoEnv>();

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const client = (c: Context<HonoEnv>, song: Song) => toClientSong(song, getRequestToken(c) ?? '');
const canDelete = (c: Context<HonoEnv>) =>
  c.get('isMasterToken') || c.get('apiKey')?.allowSongDeletion === true;

type Lookup<T> = { ok: true; value: T } | { ok: false; response: Response };

/** The song and its folder, which must still lie in a library directory. */
function findSong(c: Context<HonoEnv>): Lookup<Song> {
  const song = getSongCache().find((s) => s.id === c.req.param('id'));
  if (!song) return { ok: false, response: c.json({ error: 'Song not found' }, 404) };
  if (!resolveSecurePath(song.folder)) {
    return { ok: false, response: c.json({ error: 'Access denied' }, 403) };
  }
  return { ok: true, value: song };
}

/** Only files the scan found can be addressed, which rules out path tricks. */
const scoreOf = (song: Song, file: string) => song.folderScores.find((s) => s.file === file);
const recordingOf = (song: Song, file: string) => song.recordings.find((r) => r.file === file);

/** The re-read song after a change; a folder that vanished answers with the old entry. */
async function refreshed(song: Song): Promise<Song> {
  const songs = await refreshSongFolder(song.folder);
  return songs.find((s) => s.id === song.id) ?? songs[0] ?? song;
}

// POST /api/songs — a new song folder without karaoke `.txt` ({ title, artist? })
songFilesRouter.post('/api/songs', async (c) => {
  const input = parseSongMetaBody(await c.req.json().catch(() => null));
  if (typeof input === 'string') return c.json({ error: input }, 400);
  if (!input.title) return c.json({ error: 'title is required' }, 400);
  const root = songCreationRoot();
  if (!root) return c.json({ error: 'No song library directory is configured' }, 409);
  try {
    const { folder, meta } = await createSongFolder(root, {
      title: input.title,
      artist: input.artist ?? '',
    });
    const song = (await refreshSongFolder(folder)).find((s) => s.id === meta.id);
    if (!song) throw new Error('Song folder vanished');
    return c.json(client(c, song), 201);
  } catch (e: unknown) {
    return c.json({ error: `Failed to create song: ${errorText(e)}` }, 500);
  }
});

// PUT /api/songs/:id/meta — `song.json`: title and artist (used without `.txt`), score labels
songFilesRouter.put('/api/songs/:id/meta', async (c) => {
  const found = findSong(c);
  if (!found.ok) return found.response;
  const song = found.value;
  const input = parseSongMetaBody(await c.req.json().catch(() => null));
  if (typeof input === 'string') return c.json({ error: input }, 400);
  const unknown = Object.keys(input.labels ?? {}).find((f) => !scoreOf(song, f));
  if (unknown) return c.json({ error: `Unknown score file: ${unknown}` }, 400);
  const current: SongMeta = (await readSongMeta(song.folder)) ?? {
    version: 1,
    id: song.id,
    title: song.title,
    artist: song.artist,
    labels: {},
  };
  try {
    await writeSongMeta(song.folder, mergeSongMeta(current, input));
    return c.json(client(c, await refreshed(song)));
  } catch (e: unknown) {
    return c.json({ error: `Failed to update song: ${errorText(e)}` }, 500);
  }
});

// POST /api/songs/:id/files — store a score or a recording (multipart field "file")
songFilesRouter.post('/api/songs/:id/files', async (c) => {
  const found = findSong(c);
  if (!found.ok) return found.response;
  const song = found.value;
  try {
    const upload = (await c.req.parseBody())['file'];
    if (!(upload instanceof File)) return c.json({ error: 'No file uploaded (field "file")' }, 400);
    const kind = classifyUpload(upload.name);
    if (!kind) {
      return c.json(
        {
          error: 'Only sheet music (.mxl, .musicxml, .xml, .mid, .gp) or audio files are accepted',
        },
        400,
      );
    }
    const limit = kind.kind === 'score' ? MAX_SCORE_BYTES : MAX_RECORDING_BYTES;
    if (upload.size > limit) return c.json({ error: 'File is too large' }, 413);
    // never overwrites: replacing a file is a delete (with its permission check) plus an upload
    const target = uniqueFileName(
      song.folder,
      kind.name,
      kind.kind === 'score' ? SCORE_EXTENSIONS : RECORDING_EXTENSIONS,
    );
    await fs.promises.writeFile(
      path.join(song.folder, target),
      Buffer.from(await upload.arrayBuffer()),
    );
    return c.json({
      success: true,
      file: target,
      kind: kind.kind,
      song: client(c, await refreshed(song)),
    });
  } catch (e: unknown) {
    return c.json({ error: `Failed to store file: ${errorText(e)}` }, 500);
  }
});

// DELETE /api/songs/:id/files/:file — remove a score (with marks and label) or an extra recording;
// the mix and its stems are not addressable here
songFilesRouter.delete('/api/songs/:id/files/:file', async (c) => {
  if (!canDelete(c)) return c.json({ error: 'Permission denied: deletion not allowed' }, 403);
  const found = findSong(c);
  if (!found.ok) return found.response;
  const song = found.value;
  const file = c.req.param('file');
  const score = scoreOf(song, file);
  const filePath = score?.path ?? recordingOf(song, file)?.path;
  if (!filePath) return c.json({ error: 'File not found' }, 404);
  try {
    await fs.promises.rm(filePath, { force: true });
    if (score) {
      await fs.promises.rm(marksPathFor(filePath), { force: true });
      const meta = await readSongMeta(song.folder);
      if (meta?.labels[file]) {
        await writeSongMeta(song.folder, mergeSongMeta(meta, { labels: { [file]: '' } }));
      }
    }
    await refreshed(song);
    return c.json({ success: true });
  } catch (e: unknown) {
    return c.json({ error: `Failed to delete file: ${errorText(e)}` }, 500);
  }
});

// GET /api/songs/:id/scores/:file/marks — bar marks that align the score with a recording
songFilesRouter.get('/api/songs/:id/scores/:file/marks', async (c) => {
  const found = findSong(c);
  if (!found.ok) return found.response;
  const score = scoreOf(found.value, c.req.param('file'));
  if (!score) return c.json({ error: 'Score not found' }, 404);
  if (!score.marksPath) return c.json({ error: 'No marks stored' }, 404);
  try {
    c.header('Cache-Control', 'no-store');
    return c.json(JSON.parse(await fs.promises.readFile(score.marksPath, 'utf-8')));
  } catch (e: unknown) {
    return c.json({ error: `Failed to read marks: ${errorText(e)}` }, 500);
  }
});

// PUT /api/songs/:id/scores/:file/marks — store bar marks ({ marks, offsetSec?, audio? })
songFilesRouter.put('/api/songs/:id/scores/:file/marks', async (c) => {
  const found = findSong(c);
  if (!found.ok) return found.response;
  const score = scoreOf(found.value, c.req.param('file'));
  if (!score) return c.json({ error: 'Score not found' }, 404);
  const parsed = parseMarksBody(await c.req.json().catch(() => null));
  if (typeof parsed === 'string') return c.json({ error: parsed }, 400);
  try {
    await fs.promises.writeFile(marksPathFor(score.path), JSON.stringify(parsed), 'utf-8');
    await refreshed(found.value);
    return c.json({ success: true });
  } catch (e: unknown) {
    return c.json({ error: `Failed to store marks: ${errorText(e)}` }, 500);
  }
});
