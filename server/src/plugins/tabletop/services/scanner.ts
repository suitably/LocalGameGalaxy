import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import fg from 'fast-glob';
import { serverConfig } from '../../../config';
import type { TabletopGameEntry } from '../../../core/types';

let GAME_CACHE: TabletopGameEntry[] = [];
let IS_SCANNING = false;
let SCAN_REQUESTED_WHILE_BUSY = false;

export const getGameCache = (): TabletopGameEntry[] => GAME_CACHE;
export const setGameCache = (val: TabletopGameEntry[]): void => {
  GAME_CACHE = val;
};
export const isScanning = (): boolean => IS_SCANNING;

/**
 * Parses minimal game metadata from a JSON file.
 */
export async function parseGameFile(jsonPath: string): Promise<TabletopGameEntry | null> {
  const dirOfJson = path.dirname(jsonPath);
  if (path.basename(dirOfJson).toLowerCase() === 'assets') {
    return null;
  }

  let content: string;
  try {
    content = await fs.promises.readFile(jsonPath, 'utf-8');
  } catch {
    return null;
  }

  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  // Detect assets directory in same folder
  const candidateAssets = path.join(dirOfJson, 'assets');
  let assetsDir: string | null = null;
  try {
    if (fs.existsSync(candidateAssets) && fs.statSync(candidateAssets).isDirectory()) {
      assetsDir = candidateAssets;
    }
  } catch {
    // Ignore stat error
  }

  let format: 'flat-json' | 'pcio-folder' | 'unknown' = 'unknown';
  let widgetCount = 0;
  let cardCount = 0;

  if (parsed.widgets && typeof parsed.widgets === 'object' && !Array.isArray(parsed.widgets)) {
    const widgets = parsed.widgets as Record<string, unknown>;
    widgetCount = Object.keys(widgets).length;
    for (const val of Object.values(widgets)) {
      if (val && typeof val === 'object') {
        const obj = val as Record<string, unknown>;
        if (obj.type === 'card' || ('cardTypes' in obj && Boolean(obj.cardTypes))) {
          cardCount++;
        }
      }
    }
    format = 'pcio-folder';
  } else {
    const entries = Object.entries(parsed);
    const isFlat = entries.some(
      ([, v]) =>
        v &&
        typeof v === 'object' &&
        ('type' in (v as Record<string, unknown>) ||
          'cardTypes' in (v as Record<string, unknown>) ||
          'deck' in (v as Record<string, unknown>))
    );

    if (isFlat) {
      widgetCount = entries.length;
      for (const [, val] of entries) {
        if (val && typeof val === 'object') {
          const obj = val as Record<string, unknown>;
          if (obj.type === 'card' || ('cardTypes' in obj && Boolean(obj.cardTypes))) {
            cardCount++;
          }
        }
      }
      format = 'flat-json';
    } else if (parsed.table && typeof parsed.table === 'object') {
      format = 'unknown';
      widgetCount = 0;
      cardCount = 0;
    } else {
      // Not a recognized tabletop game definition
      return null;
    }
  }

  const baseName = path.basename(jsonPath, '.json');
  const dirName = path.basename(dirOfJson);
  const fallbackName =
    baseName.toLowerCase() === 'template' ||
    baseName.toLowerCase() === 'game' ||
    baseName.toLowerCase() === 'room'
      ? dirName
      : baseName;

  const name =
    typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : fallbackName;
  const author =
    typeof parsed.author === 'string' && parsed.author.trim() ? parsed.author.trim() : undefined;
  const description =
    typeof parsed.description === 'string' && parsed.description.trim()
      ? parsed.description.trim()
      : undefined;

  let updatedAt = Date.now();
  try {
    const stat = await fs.promises.stat(jsonPath);
    updatedAt = Math.round(stat.mtimeMs);
  } catch {
    // Ignore stat error
  }

  const id = crypto.createHash('md5').update(jsonPath).digest('hex').slice(0, 16);

  return {
    id,
    name,
    author,
    description,
    widgetCount,
    cardCount,
    format,
    jsonPath,
    assetsDir,
    updatedAt,
  };
}

/**
 * Scans all configured tabletopDirectories for game definitions.
 */
export const scanGames = async (): Promise<void> => {
  if (IS_SCANNING) {
    SCAN_REQUESTED_WHILE_BUSY = true;
    return;
  }
  IS_SCANNING = true;
  const startTime = Date.now();
  const dirs = serverConfig.tabletopDirectories || [];
  console.log(`[TabletopScanner] Starting scan of ${dirs.length} directories...`);

  const newGames: TabletopGameEntry[] = [];

  for (const dir of dirs) {
    try {
      if (!fs.existsSync(dir)) continue;

      const jsonFiles = await fg('**/*.json', {
        cwd: dir,
        absolute: true,
        ignore: ['**/node_modules/**', '**/.*', '**/assets/**'],
        onlyFiles: true,
      });

      for (const jsonPath of jsonFiles) {
        try {
          const game = await parseGameFile(jsonPath);
          if (game) {
            newGames.push(game);
          }
        } catch {
          // Ignore individual game parse error
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[TabletopScanner] Failed to scan ${dir}:`, msg);
    }
  }

  GAME_CACHE = newGames;
  IS_SCANNING = false;
  console.log(
    `[TabletopScanner] Finished. Cached ${newGames.length} games in ${(Date.now() - startTime) / 1000}s.`
  );

  if (SCAN_REQUESTED_WHILE_BUSY) {
    SCAN_REQUESTED_WHILE_BUSY = false;
    setTimeout(scanGames, 500);
  }
};
