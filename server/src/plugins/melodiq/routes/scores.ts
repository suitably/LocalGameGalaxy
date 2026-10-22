import { Hono, type Context } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import { resolveSecurePath } from '../../../utils/helpers';
import { addOrUpdateSongInCache, getSongCache } from '../services/scanner';
import {
  MAX_SCORE_BYTES,
  marksPathFor,
  parseMarksBody,
  safeScoreFileName,
  uniqueFileName,
} from '../services/scoreFiles';
import type { HonoEnv, Song, SongScore } from '../../../core/types';

export const scoresRouter = new Hono<HonoEnv>();

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

type Lookup<T> = { ok: true; value: T } | { ok: false; response: Response };

function songFolder(c: Context<HonoEnv>): Lookup<{ song: Song; folder: string }> {
  const song = getSongCache().find((s) => s.id === c.req.param('id'));
  if (!song?.txtPath) return { ok: false, response: c.json({ error: 'Song not found' }, 404) };
  const folder = resolveSecurePath(path.dirname(song.txtPath));
  if (!folder) return { ok: false, response: c.json({ error: 'Access denied' }, 403) };
  return { ok: true, value: { song, folder } };
}

/** Only score files the scanner found for this song can be addressed, which rules out path tricks. */
function songScore(c: Context<HonoEnv>): Lookup<{ song: Song; score: SongScore }> {
  const found = songFolder(c);
  if (!found.ok) return found;
  const score = (found.value.song.scores ?? []).find((s) => s.file === c.req.param('file'));
  if (!score) return { ok: false, response: c.json({ error: 'Score not found' }, 404) };
  return { ok: true, value: { song: found.value.song, score } };
}

// POST /api/songs/:id/scores — store a MusicXML/MIDI file in the song folder (multipart field "file")
scoresRouter.post('/api/songs/:id/scores', async (c) => {
  const lookup = songFolder(c);
  if (!lookup.ok) return lookup.response;
  const found = lookup.value;
  try {
    const body = await c.req.parseBody();
    const upload = body['file'];
    if (!(upload instanceof File)) return c.json({ error: 'No file uploaded (field "file")' }, 400);
    if (upload.size > MAX_SCORE_BYTES) return c.json({ error: 'File is too large' }, 413);
    const name = safeScoreFileName(upload.name);
    if (!name)
      return c.json({ error: 'Only .mxl, .musicxml, .xml, .mid or .midi files are accepted' }, 400);
    const replace = body['replace'] === '1';
    const target = replace ? name : uniqueFileName(found.folder, name);
    await fs.promises.writeFile(
      path.join(found.folder, target),
      Buffer.from(await upload.arrayBuffer()),
    );
    await addOrUpdateSongInCache(found.song.txtPath);
    return c.json({ success: true, file: target });
  } catch (e: unknown) {
    return c.json({ error: `Failed to store score: ${errorText(e)}` }, 500);
  }
});

// GET /api/songs/:id/scores/:file/marks — bar marks that align the score with the recording
scoresRouter.get('/api/songs/:id/scores/:file/marks', async (c) => {
  const lookup = songScore(c);
  if (!lookup.ok) return lookup.response;
  const found = lookup.value;
  if (!found.score.marksPath) return c.json({ error: 'No marks stored' }, 404);
  try {
    const data = JSON.parse(await fs.promises.readFile(found.score.marksPath, 'utf-8'));
    c.header('Cache-Control', 'no-store');
    return c.json(data);
  } catch (e: unknown) {
    return c.json({ error: `Failed to read marks: ${errorText(e)}` }, 500);
  }
});

// PUT /api/songs/:id/scores/:file/marks — store bar marks ({ marks, offsetSec?, audio? })
scoresRouter.put('/api/songs/:id/scores/:file/marks', async (c) => {
  const lookup = songScore(c);
  if (!lookup.ok) return lookup.response;
  const found = lookup.value;
  const parsed = parseMarksBody(await c.req.json().catch(() => null));
  if (typeof parsed === 'string') return c.json({ error: parsed }, 400);
  try {
    await fs.promises.writeFile(marksPathFor(found.score.path), JSON.stringify(parsed), 'utf-8');
    await addOrUpdateSongInCache(found.song.txtPath);
    return c.json({ success: true });
  } catch (e: unknown) {
    return c.json({ error: `Failed to store marks: ${errorText(e)}` }, 500);
  }
});

// DELETE /api/songs/:id/scores/:file — remove a score and its marks
scoresRouter.delete('/api/songs/:id/scores/:file', async (c) => {
  const apiKey = c.get('apiKey');
  if (!c.get('isMasterToken') && !apiKey?.allowSongDeletion) {
    return c.json({ error: 'Permission denied: deletion not allowed' }, 403);
  }
  const lookup = songScore(c);
  if (!lookup.ok) return lookup.response;
  const found = lookup.value;
  try {
    await fs.promises.rm(found.score.path, { force: true });
    if (found.score.marksPath) await fs.promises.rm(found.score.marksPath, { force: true });
    await addOrUpdateSongInCache(found.song.txtPath);
    return c.json({ success: true });
  } catch (e: unknown) {
    return c.json({ error: `Failed to delete score: ${errorText(e)}` }, 500);
  }
});
