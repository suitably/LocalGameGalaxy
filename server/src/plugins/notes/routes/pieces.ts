import { Hono, type Context } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import { getRequestToken } from '../../../core/auth';
import {
  MAX_SCORE_BYTES,
  SCORE_EXTENSIONS,
  marksPathFor,
  parseMarksBody,
  uniqueFileName,
} from '../../../utils/scoreFiles';
import {
  MAX_RECORDING_BYTES,
  RECORDING_EXTENSIONS,
  classifyUpload,
  createPiece,
  findPiece,
  listPieces,
  parsePieceMeta,
  pieceFile,
  toClientPiece,
  writeMeta,
  type NotesPiece,
} from '../services/library';
import type { HonoEnv } from '../../../core/types';

export const notesPiecesRouter = new Hono<HonoEnv>();

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const client = (c: Context<HonoEnv>, piece: NotesPiece) =>
  toClientPiece(piece, getRequestToken(c) ?? '');

type Lookup<T> = { ok: true; value: T } | { ok: false; response: Response };

async function piece(c: Context<HonoEnv>): Promise<Lookup<NotesPiece>> {
  const found = await findPiece(c.req.param('id') ?? '');
  return found
    ? { ok: true, value: found }
    : { ok: false, response: c.json({ error: 'Piece not found' }, 404) };
}

const canDelete = (c: Context<HonoEnv>) =>
  c.get('isMasterToken') || c.get('apiKey')?.allowSongDeletion === true;

// GET /api/notes/pieces — the library
notesPiecesRouter.get('/api/notes/pieces', async (c) => {
  c.header('Cache-Control', 'no-store');
  return c.json((await listPieces()).map((p) => client(c, p)));
});

// GET /api/notes/pieces/:id
notesPiecesRouter.get('/api/notes/pieces/:id', async (c) => {
  const found = await piece(c);
  if (!found.ok) return found.response;
  c.header('Cache-Control', 'no-store');
  return c.json(client(c, found.value));
});

// POST /api/notes/pieces — create a piece ({ title, artist?, songId? })
notesPiecesRouter.post('/api/notes/pieces', async (c) => {
  const meta = parsePieceMeta(await c.req.json().catch(() => null));
  if (typeof meta === 'string') return c.json({ error: meta }, 400);
  try {
    return c.json(client(c, await createPiece(meta)), 201);
  } catch (e: unknown) {
    return c.json({ error: `Failed to create piece: ${errorText(e)}` }, 500);
  }
});

// PUT /api/notes/pieces/:id — rename / link ({ title, artist?, songId? }); the folder keeps its
// name; `songId` left out keeps the current link, `null` removes it
notesPiecesRouter.put('/api/notes/pieces/:id', async (c) => {
  const found = await piece(c);
  if (!found.ok) return found.response;
  const input = parsePieceMeta(await c.req.json().catch(() => null));
  if (typeof input === 'string') return c.json({ error: input }, 400);
  const meta = { ...input, songId: input.songId === undefined ? found.value.songId : input.songId };
  try {
    await writeMeta(found.value.folder, meta);
    return c.json(client(c, { ...found.value, ...meta }));
  } catch (e: unknown) {
    return c.json({ error: `Failed to update piece: ${errorText(e)}` }, 500);
  }
});

// DELETE /api/notes/pieces/:id — remove the piece with all its files
notesPiecesRouter.delete('/api/notes/pieces/:id', async (c) => {
  if (!canDelete(c)) return c.json({ error: 'Permission denied: deletion not allowed' }, 403);
  const found = await piece(c);
  if (!found.ok) return found.response;
  try {
    await fs.promises.rm(found.value.folder, { recursive: true, force: true });
    return c.json({ success: true });
  } catch (e: unknown) {
    return c.json({ error: `Failed to delete piece: ${errorText(e)}` }, 500);
  }
});

// POST /api/notes/pieces/:id/files — store a score or a recording (multipart field "file")
notesPiecesRouter.post('/api/notes/pieces/:id/files', async (c) => {
  const found = await piece(c);
  if (!found.ok) return found.response;
  try {
    const upload = (await c.req.parseBody())['file'];
    if (!(upload instanceof File)) return c.json({ error: 'No file uploaded (field "file")' }, 400);
    const kind = classifyUpload(upload.name);
    if (!kind) {
      return c.json(
        { error: 'Only sheet music (.mxl, .musicxml, .xml, .mid) or audio files are accepted' },
        400,
      );
    }
    const limit = kind.kind === 'score' ? MAX_SCORE_BYTES : MAX_RECORDING_BYTES;
    if (upload.size > limit) return c.json({ error: 'File is too large' }, 413);
    // never overwrites: replacing a file is a delete (with its permission check) plus an upload
    const target = uniqueFileName(
      found.value.folder,
      kind.name,
      kind.kind === 'score' ? SCORE_EXTENSIONS : RECORDING_EXTENSIONS,
    );
    await fs.promises.writeFile(
      path.join(found.value.folder, target),
      Buffer.from(await upload.arrayBuffer()),
    );
    const updated = await findPiece(found.value.id);
    return c.json({
      success: true,
      file: target,
      kind: kind.kind,
      piece: updated && client(c, updated),
    });
  } catch (e: unknown) {
    return c.json({ error: `Failed to store file: ${errorText(e)}` }, 500);
  }
});

// DELETE /api/notes/pieces/:id/files/:file — remove a score (with its marks) or a recording
notesPiecesRouter.delete('/api/notes/pieces/:id/files/:file', async (c) => {
  if (!canDelete(c)) return c.json({ error: 'Permission denied: deletion not allowed' }, 403);
  const found = await piece(c);
  if (!found.ok) return found.response;
  const filePath = pieceFile(found.value, c.req.param('file'));
  if (!filePath) return c.json({ error: 'File not found' }, 404);
  try {
    await fs.promises.rm(filePath, { force: true });
    await fs.promises.rm(marksPathFor(filePath), { force: true });
    return c.json({ success: true });
  } catch (e: unknown) {
    return c.json({ error: `Failed to delete file: ${errorText(e)}` }, 500);
  }
});

// GET /api/notes/pieces/:id/scores/:file/marks — bar marks that align the score with a recording
notesPiecesRouter.get('/api/notes/pieces/:id/scores/:file/marks', async (c) => {
  const found = await piece(c);
  if (!found.ok) return found.response;
  const score = found.value.scores.find((s) => s.file === c.req.param('file'));
  if (!score) return c.json({ error: 'Score not found' }, 404);
  if (!score.marksPath) return c.json({ error: 'No marks stored' }, 404);
  try {
    c.header('Cache-Control', 'no-store');
    return c.json(JSON.parse(await fs.promises.readFile(score.marksPath, 'utf-8')));
  } catch (e: unknown) {
    return c.json({ error: `Failed to read marks: ${errorText(e)}` }, 500);
  }
});

// PUT /api/notes/pieces/:id/scores/:file/marks — store bar marks ({ marks, offsetSec?, audio? })
notesPiecesRouter.put('/api/notes/pieces/:id/scores/:file/marks', async (c) => {
  const found = await piece(c);
  if (!found.ok) return found.response;
  const score = found.value.scores.find((s) => s.file === c.req.param('file'));
  if (!score) return c.json({ error: 'Score not found' }, 404);
  const parsed = parseMarksBody(await c.req.json().catch(() => null));
  if (typeof parsed === 'string') return c.json({ error: parsed }, 400);
  try {
    await fs.promises.writeFile(marksPathFor(score.path), JSON.stringify(parsed), 'utf-8');
    return c.json({ success: true });
  } catch (e: unknown) {
    return c.json({ error: `Failed to store marks: ${errorText(e)}` }, 500);
  }
});
