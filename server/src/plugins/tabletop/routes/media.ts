import { Hono } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import { serverConfig } from '../../../config';
import { resolveSecurePath } from '../../../utils/helpers';
import type { HonoEnv } from '../../../core/types';

export const tabletopMediaRouter = new Hono<HonoEnv>();

export async function detectMimeFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const EXT_MAP: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.gif': 'image/gif',
    '.json': 'application/json',
  };
  if (EXT_MAP[ext]) return EXT_MAP[ext];

  // Magic bytes fallback for extensionless files (e.g. Frontiers assets)
  let fd: fs.promises.FileHandle | null = null;
  try {
    fd = await fs.promises.open(filePath, 'r');
    const buf = Buffer.alloc(4);
    await fd.read(buf, 0, 4, 0);
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
    if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'image/gif';
    if (buf[0] === 0x3c) return 'image/svg+xml'; // < = SVG or XML
  } catch {
    // Ignore read errors
  } finally {
    if (fd) await fd.close();
  }

  return 'application/octet-stream';
}

tabletopMediaRouter.get('/tabletop/media', async (c) => {
  const targetPath = c.req.query('path');
  if (!targetPath) {
    return c.text('Missing path', 400);
  }

  // Remote web URLs are not served through /tabletop/media
  if (targetPath.startsWith('http://') || targetPath.startsWith('https://')) {
    return c.text('Remote URLs are not supported via /tabletop/media', 400);
  }

  // Token authentication check
  const queryToken = c.req.query('token');
  const authHeader = c.req.header('Authorization');
  const token = queryToken || (authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : null);

  if (serverConfig.token && token && token !== serverConfig.token) {
    const isApiKey = serverConfig.apiKeys.some((k) => k.token === token);
    if (!isApiKey) {
      return c.text('Unauthorized', 401);
    }
  }

  // Verify targetPath is securely within tabletopDirectories
  const safePath = resolveSecurePath(targetPath, serverConfig.tabletopDirectories);
  if (!safePath) {
    return c.text('Access Denied or File Not Found', 403);
  }

  try {
    const stat = await fs.promises.stat(safePath);
    if (stat.isDirectory()) {
      return c.text('Path is a directory', 400);
    }

    const fileSize = stat.size;
    const mimeType = await detectMimeFromFile(safePath);
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
