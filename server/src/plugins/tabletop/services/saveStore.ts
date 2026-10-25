import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { serverConfig } from '../../../config';

/**
 * Named table states (save games) and default templates on disk.
 *
 * Both live in `<tabletop save root>/.states/`; the scanner skips dot folders, so these files
 * never show up as games. Saves: `saves/<id>.json` (meta + game). Templates:
 * `templates/<gameId>.json` (the game JSON a new table of that game starts from).
 */
export const STATES_FOLDER = '.states';
const statesRoot = (): string => path.join(serverConfig.tabletopSaveRoot, STATES_FOLDER);
const savesDir = (): string => path.join(statesRoot(), 'saves');
const templatesDir = (): string => path.join(statesRoot(), 'templates');

export interface TabletopSaveMeta {
  id: string;
  gameId: string;
  name: string;
  ownerId: string;
  ownerName: string;
  savedAt: number;
}

interface TabletopSaveFile extends TabletopSaveMeta {
  game: unknown;
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;
export const isSafeId = (id: string): boolean => SAFE_ID.test(id);

/** Names compare trimmed and case-insensitive, so "Round 1" and "round 1 " collide. */
export const normalizeSaveName = (name: string): string => name.trim().toLocaleLowerCase();

/** First free "name (n)" for a taken name. */
export function suggestFreeName(name: string, taken: Iterable<string>): string {
  const used = new Set(Array.from(taken, normalizeSaveName));
  const base = name.trim().replace(/\s+\(\d+\)$/, '');
  if (!used.has(normalizeSaveName(name))) return name.trim();
  for (let i = 2; ; i++) {
    const candidate = `${base} (${i})`;
    if (!used.has(normalizeSaveName(candidate))) return candidate;
  }
}

const savePath = (id: string) => path.join(savesDir(), `${id}.json`);

async function readSaveFile(file: string): Promise<TabletopSaveFile | null> {
  try {
    const data = JSON.parse(await fs.promises.readFile(file, 'utf-8')) as TabletopSaveFile;
    return data && typeof data.id === 'string' ? data : null;
  } catch {
    return null;
  }
}

const toMeta = ({ id, gameId, name, ownerId, ownerName, savedAt }: TabletopSaveFile) => ({
  id,
  gameId,
  name,
  ownerId,
  ownerName,
  savedAt,
});

export async function listSaves(gameId?: string): Promise<TabletopSaveMeta[]> {
  const files = await fs.promises.readdir(savesDir()).catch(() => [] as string[]);
  const saves = await Promise.all(
    files.filter((f) => f.endsWith('.json')).map((f) => readSaveFile(path.join(savesDir(), f))),
  );
  return saves
    .filter((s): s is TabletopSaveFile => !!s && (!gameId || s.gameId === gameId))
    .map(toMeta)
    .sort((a, b) => b.savedAt - a.savedAt);
}

export async function getSave(id: string): Promise<TabletopSaveFile | null> {
  return isSafeId(id) ? readSaveFile(savePath(id)) : null;
}

export async function writeSave(
  meta: Omit<TabletopSaveMeta, 'id' | 'savedAt'> & { id?: string },
  game: unknown,
): Promise<TabletopSaveMeta> {
  const record: TabletopSaveFile = {
    ...meta,
    id: meta.id ?? crypto.randomBytes(8).toString('hex'),
    savedAt: Date.now(),
    game,
  };
  await fs.promises.mkdir(savesDir(), { recursive: true });
  await fs.promises.writeFile(savePath(record.id), JSON.stringify(record), 'utf-8');
  return toMeta(record);
}

export async function deleteSave(id: string): Promise<void> {
  await fs.promises.rm(savePath(id), { force: true });
}

const templatePath = (gameId: string) => path.join(templatesDir(), `${gameId}.json`);

/** The stored default template of a game, as JSON text; null if there is none. */
export async function readTemplate(gameId: string): Promise<string | null> {
  if (!isSafeId(gameId)) return null;
  return fs.promises.readFile(templatePath(gameId), 'utf-8').catch(() => null);
}

export async function writeTemplate(gameId: string, json: string): Promise<void> {
  await fs.promises.mkdir(templatesDir(), { recursive: true });
  await fs.promises.writeFile(templatePath(gameId), json, 'utf-8');
}

export async function deleteTemplate(gameId: string): Promise<boolean> {
  const file = templatePath(gameId);
  if (!fs.existsSync(file)) return false;
  await fs.promises.rm(file, { force: true });
  return true;
}
