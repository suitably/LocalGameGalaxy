import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { serverConfig } from '../../../config';

/**
 * Melodiq song library per API user (#636, ADR-0010): favourites and playlists. The owner is the
 * requester id from `getRequester` (API key id, or `master`); tokens are never stored. Others see
 * a playlist only when it is `shared`, and only read it.
 */
export interface StoredPlaylist {
  id: string;
  name: string;
  songs: string[];
  ownerId: string;
  ownerName: string;
  shared: boolean;
  updatedAt: number;
}

interface LibraryFile {
  version: 1;
  favorites: Record<string, string[]>;
  playlists: StoredPlaylist[];
}

export const LIBRARY_FILE = 'melodiq-library.json';
const LEGACY_PLAYLISTS_FILE = 'playlists.json';
const MAX_SONGS = 10000;
const MAX_NAME = 120;
const SONG_ID = /^[\w.:-]{1,256}$/;

let libraryFile: string | null = null;
let library: LibraryFile | null = null;

const configDir = (): string => {
  if (process.env.CONFIG_PATH) return path.dirname(path.resolve(process.env.CONFIG_PATH));
  if (fs.existsSync('/app/config') && fs.statSync('/app/config').isDirectory())
    return '/app/config';
  return process.cwd();
};

/** Valid, de-duplicated song ids (at most MAX_SONGS); null when `value` is not an array. */
export function parseSongIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids = value.filter((v): v is string => typeof v === 'string' && SONG_ID.test(v));
  return [...new Set(ids)].slice(0, MAX_SONGS);
}

export const parsePlaylistName = (value: unknown): string =>
  typeof value === 'string' ? value.trim().slice(0, MAX_NAME) : '';

/**
 * One-time import of the old shared `playlists.json` (non-destructive): the creator token is
 * resolved to its API key id and dropped; the old lists were visible to everyone, so `shared`.
 */
function importLegacyPlaylists(dir: string): StoredPlaylist[] {
  const file = path.join(dir, LEGACY_PLAYLISTS_FILE);
  if (!fs.existsSync(file)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((p: Record<string, unknown>) => {
      const name = parsePlaylistName(p?.name);
      if (typeof p?.id !== 'string' || !name) return [];
      const key = serverConfig.apiKeys.find((k) => k.token === p.creatorToken);
      return [
        {
          id: p.id,
          name,
          songs: parseSongIds(p.songs) ?? [],
          ownerId: key ? key.id : 'master',
          ownerName: key ? key.name : 'Master',
          shared: true,
          updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : Date.now(),
        },
      ];
    });
  } catch (e) {
    console.warn(
      '[SongLibrary] Could not import playlists.json:',
      e instanceof Error ? e.message : e,
    );
    return [];
  }
}

function load(): LibraryFile {
  if (library) return library;
  const dir = configDir();
  libraryFile = libraryFile ?? path.join(dir, LIBRARY_FILE);
  try {
    const raw = JSON.parse(fs.readFileSync(libraryFile, 'utf-8')) as Partial<LibraryFile>;
    library = {
      version: 1,
      favorites: raw.favorites && typeof raw.favorites === 'object' ? raw.favorites : {},
      playlists: Array.isArray(raw.playlists) ? raw.playlists : [],
    };
  } catch {
    library = { version: 1, favorites: {}, playlists: importLegacyPlaylists(dir) };
    if (library.playlists.length > 0) save();
  }
  return library;
}

function save(): void {
  if (!library || !libraryFile) return;
  try {
    fs.mkdirSync(path.dirname(libraryFile), { recursive: true });
    fs.writeFileSync(libraryFile, JSON.stringify(library, null, 2), 'utf-8');
  } catch (e) {
    console.error('[SongLibrary] Failed to save:', e instanceof Error ? e.message : e);
  }
}

export const getFavorites = (ownerId: string): string[] => load().favorites[ownerId] ?? [];

export function setFavorites(ownerId: string, songIds: string[]): string[] {
  load().favorites[ownerId] = songIds;
  save();
  return songIds;
}

/** The owner's playlists plus the playlists others share. */
export const listVisiblePlaylists = (ownerId: string): StoredPlaylist[] =>
  load().playlists.filter((p) => p.ownerId === ownerId || p.shared);

export const getPlaylist = (id: string): StoredPlaylist | undefined =>
  load().playlists.find((p) => p.id === id);

export function createPlaylist(
  owner: { id: string; name: string },
  input: { name: string; songs: string[]; shared: boolean },
): StoredPlaylist {
  const playlist: StoredPlaylist = {
    id: crypto.randomUUID(),
    ...input,
    ownerId: owner.id,
    ownerName: owner.name,
    updatedAt: Date.now(),
  };
  load().playlists.push(playlist);
  save();
  return playlist;
}

export function updatePlaylist(
  id: string,
  patch: Partial<Pick<StoredPlaylist, 'name' | 'songs' | 'shared'>>,
): StoredPlaylist | undefined {
  const playlist = getPlaylist(id);
  if (!playlist) return undefined;
  Object.assign(playlist, patch, { updatedAt: Date.now() });
  save();
  return playlist;
}

export function deletePlaylist(id: string): boolean {
  const lib = load();
  const before = lib.playlists.length;
  lib.playlists = lib.playlists.filter((p) => p.id !== id);
  if (lib.playlists.length === before) return false;
  save();
  return true;
}
