import { Hono, type Context } from 'hono';
import fs from 'node:fs';
import { getRequestToken } from '../../../core/auth';
import { getSongCache } from '../services/scanner';
import { marksPathFor, parseMarksBody, type SongScoreFile } from '../../../utils/scoreFiles';
import { piecesBySong, toClientPiece, type NotesPiece } from '../../notes/services/library';
import type { ClientSongScore, HonoEnv, Song } from '../../../core/types';

/**
 * Deprecated song-score routes (Q18). Sheet music lives only in the Notes library; a song's
 * scores are the scores of the Notes pieces linked to it (`songId`). Reads and bar marks are
 * answered from those pieces; uploading or deleting here answers 410 with the Notes route to use.
 */
export const scoresRouter = new Hono<HonoEnv>();

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

type Lookup<T> = { ok: true; value: T } | { ok: false; response: Response };

/** Scores of the Notes pieces linked to a song, as clients see them. */
export function clientSongScores(pieces: NotesPiece[], token: string): ClientSongScore[] {
  return pieces.flatMap((piece) =>
    toClientPiece(piece, token).scores.map((s) => ({ pieceId: piece.id, ...s })),
  );
}

const findSong = (c: Context<HonoEnv>): Song | null =>
  getSongCache().find((s) => s.id === c.req.param('id')) ?? null;

/** The first piece linked to the song with a score of this name; only listed files match. */
async function linkedScore(
  c: Context<HonoEnv>,
): Promise<Lookup<{ piece: NotesPiece; score: SongScoreFile }>> {
  const song = findSong(c);
  if (!song) return { ok: false, response: c.json({ error: 'Song not found' }, 404) };
  const file = c.req.param('file');
  for (const piece of (await piecesBySong()).get(song.id) ?? []) {
    const score = piece.scores.find((s) => s.file === file);
    if (score) return { ok: true, value: { piece, score } };
  }
  return { ok: false, response: c.json({ error: 'Score not found' }, 404) };
}

const gone = (c: Context<HonoEnv>, use: string) =>
  c.json(
    {
      error: 'Song folders no longer store sheet music; use the Notes library (piece with songId)',
      use,
    },
    410,
  );

// GET /api/songs/:id/scores — scores of the Notes pieces linked to the song
scoresRouter.get('/api/songs/:id/scores', async (c) => {
  const song = findSong(c);
  if (!song) return c.json({ error: 'Song not found' }, 404);
  c.header('Cache-Control', 'no-store');
  const pieces = (await piecesBySong()).get(song.id) ?? [];
  return c.json(clientSongScores(pieces, getRequestToken(c) ?? ''));
});

// POST /api/songs/:id/scores — deprecated: create a piece with songId and upload into it
scoresRouter.post('/api/songs/:id/scores', (c) =>
  gone(
    c,
    'POST /api/notes/pieces { title, artist, songId }, then POST /api/notes/pieces/:id/files',
  ),
);

// DELETE /api/songs/:id/scores/:file — deprecated: delete the file from its Notes piece
scoresRouter.delete('/api/songs/:id/scores/:file', (c) =>
  gone(c, 'DELETE /api/notes/pieces/:id/files/:file'),
);

// GET /api/songs/:id/scores/:file/marks — deprecated alias of the linked piece's marks
scoresRouter.get('/api/songs/:id/scores/:file/marks', async (c) => {
  const lookup = await linkedScore(c);
  if (!lookup.ok) return lookup.response;
  const { score } = lookup.value;
  if (!score.marksPath) return c.json({ error: 'No marks stored' }, 404);
  try {
    c.header('Cache-Control', 'no-store');
    return c.json(JSON.parse(await fs.promises.readFile(score.marksPath, 'utf-8')));
  } catch (e: unknown) {
    return c.json({ error: `Failed to read marks: ${errorText(e)}` }, 500);
  }
});

// PUT /api/songs/:id/scores/:file/marks — deprecated alias: stores the marks in the linked piece
scoresRouter.put('/api/songs/:id/scores/:file/marks', async (c) => {
  const lookup = await linkedScore(c);
  if (!lookup.ok) return lookup.response;
  const parsed = parseMarksBody(await c.req.json().catch(() => null));
  if (typeof parsed === 'string') return c.json({ error: parsed }, 400);
  try {
    const target = marksPathFor(lookup.value.score.path);
    await fs.promises.writeFile(target, JSON.stringify(parsed), 'utf-8');
    return c.json({ success: true });
  } catch (e: unknown) {
    return c.json({ error: `Failed to store marks: ${errorText(e)}` }, 500);
  }
});
