import { Hono } from 'hono';
import path from 'node:path';
import { streamFile } from '../../../utils/fileStream';
import { findPiece, pieceFile } from '../services/library';
import type { HonoEnv } from '../../../core/types';

export const notesMediaRouter = new Hono<HonoEnv>();

const MIME_MAP: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.flac': 'audio/flac',
  '.wav': 'audio/wav',
  '.webm': 'audio/webm',
  '.mxl': 'application/vnd.recordare.musicxml',
  '.musicxml': 'application/vnd.recordare.musicxml+xml',
  '.xml': 'application/xml',
  '.mid': 'audio/midi',
  '.midi': 'audio/midi',
};

// GET /notes/media/:id/:file — a score or recording of a piece (token via header or ?token=)
notesMediaRouter.get('/notes/media/:id/:file', async (c) => {
  const found = await findPiece(c.req.param('id'));
  const filePath = found && pieceFile(found, c.req.param('file'));
  if (!filePath) return c.text('Not found', 404);
  try {
    const mime = MIME_MAP[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
    return await streamFile(c, filePath, mime);
  } catch (e: unknown) {
    return c.text(`File error: ${e instanceof Error ? e.message : String(e)}`, 500);
  }
});
