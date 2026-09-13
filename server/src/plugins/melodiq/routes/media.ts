import { Hono } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import { resolveSecurePath } from '../../../utils/helpers';
import type { HonoEnv } from '../../../core/types';

export const mediaRouter = new Hono<HonoEnv>();

const MIME_MAP: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

mediaRouter.get('/media', async (c) => {
  const targetPath = c.req.query('path');
  if (!targetPath) {
    return c.text('Missing path', 400);
  }

  // Remote web URLs are not served through /media (embed or load directly in client)
  if (targetPath.startsWith('http://') || targetPath.startsWith('https://')) {
    return c.text('Remote URLs are not supported via /media', 400);
  }

  const safePath = resolveSecurePath(targetPath);
  if (!safePath) {
    return c.text('Access Denied or File Not Found', 403);
  }

  try {
    const stat = await fs.promises.stat(safePath);
    const fileSize = stat.size;
    const ext = path.extname(safePath).toLowerCase();
    const mimeType = MIME_MAP[ext] || 'application/octet-stream';

    const range = c.req.header('range');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const nodeStream = fs.createReadStream(safePath, { start, end });

      return c.body(nodeStream as unknown as ReadableStream, 206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=604800, immutable',
      });
    }

    const nodeStream = fs.createReadStream(safePath);
    return c.body(nodeStream as unknown as ReadableStream, 200, {
      'Accept-Ranges': 'bytes',
      'Content-Length': String(fileSize),
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=604800, immutable',
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.text(`File error: ${msg}`, 500);
  }
});
