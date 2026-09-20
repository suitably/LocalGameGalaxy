import { networkInterfaces } from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import sanitize from 'sanitize-filename';
import { serverConfig } from '../config';

export const getLocalIp = (): string => {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    const netList = nets[name];
    if (netList) {
      for (const net of netList) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  }
  return 'localhost';
};

export const sanitizeFilename = (str: string): string => {
  return sanitize(str).replace(/\s+/g, ' ').trim();
};

export const generateId = (title: string, artist: string, relPath: string): string => {
  // Ensure forward slashes for consistency with Client
  const normalizedPath = relPath.replace(/\\/g, '/');
  const str = `${artist}-${title}-${normalizedPath}`;
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 32);
};

export const resolveSecurePath = (
  userPath?: string | null,
  allowedDirs: string[] = serverConfig.directories
): string | null => {
  if (!userPath) return null;
  const safePath = path.resolve(userPath);
  const isAllowed = allowedDirs.some((dir) => {
    const normalizedDir = path.resolve(dir);
    return safePath === normalizedDir || safePath.startsWith(normalizedDir + path.sep);
  });
  return isAllowed && fs.existsSync(safePath) ? safePath : null;
};
