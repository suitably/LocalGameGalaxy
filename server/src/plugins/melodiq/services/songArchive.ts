import fs from 'node:fs';
import path from 'node:path';
import { serverConfig } from '../../../config';
import type { ZipEntry } from '../../../utils/zipStream';

/** True when the folder is a configured library directory itself (a loose song in its root). */
export const isLibraryRoot = (folder: string) =>
  serverConfig.directories.some((dir) => path.resolve(dir) === path.resolve(folder));

/**
 * Every regular file of a song folder, sub-folders included, as ZIP entries under the folder's
 * name. Hidden files and symbolic links are left out, so nothing outside the folder is read.
 */
export async function songArchiveEntries(folder: string): Promise<ZipEntry[]> {
  const base = path.basename(folder);
  const entries: ZipEntry[] = [];
  const walk = async (dir: string, prefix: string) => {
    const items = await fs.promises.readdir(dir, { withFileTypes: true });
    items.sort((a, b) => a.name.localeCompare(b.name));
    for (const item of items) {
      if (item.name.startsWith('.')) continue;
      const full = path.join(dir, item.name);
      const name = `${prefix}/${item.name}`;
      if (item.isDirectory()) await walk(full, name);
      else if (item.isFile()) {
        const stat = await fs.promises.stat(full);
        entries.push({ name, path: full, size: stat.size, mtime: stat.mtime });
      }
    }
  };
  await walk(folder, base);
  return entries;
}

/** `attachment` header with an ASCII fallback and the UTF-8 name (RFC 6266). */
export function attachmentHeader(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
