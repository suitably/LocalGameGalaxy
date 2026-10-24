import fs from 'node:fs';
import type { Context } from 'hono';

/**
 * Streams a file with HTTP range support (audio seeking). The caller has already checked
 * that `filePath` is allowed; this only reads it.
 */
export async function streamFile(
  c: Context,
  filePath: string,
  mimeType: string,
  cacheControl = 'no-cache',
): Promise<Response> {
  const stat = await fs.promises.stat(filePath);
  if (!stat.isFile()) return c.text('Not a file', 400);
  const fileSize = stat.size;
  const range = c.req.header('range');

  if (range) {
    const [rawStart, rawEnd] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(rawStart, 10);
    const end = rawEnd ? Math.min(parseInt(rawEnd, 10), fileSize - 1) : fileSize - 1;
    if (!Number.isFinite(start) || start < 0 || start > end) {
      return c.body(null, 416, { 'Content-Range': `bytes */${fileSize}` });
    }
    const nodeStream = fs.createReadStream(filePath, { start, end });
    return c.body(nodeStream as unknown as ReadableStream, 206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': String(end - start + 1),
      'Content-Type': mimeType,
      'Cache-Control': cacheControl,
    });
  }

  const nodeStream = fs.createReadStream(filePath);
  return c.body(nodeStream as unknown as ReadableStream, 200, {
    'Accept-Ranges': 'bytes',
    'Content-Length': String(fileSize),
    'Content-Type': mimeType,
    'Cache-Control': cacheControl,
  });
}
