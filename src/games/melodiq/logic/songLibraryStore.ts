import type { Playlist } from '../db';
import type { LibraryPlaylist } from './songLibrary';

/**
 * Where favourites and playlists live (#636, ADR-0010): the companion server per API user, or this
 * device when a local song folder is used instead (or no companion is active). One interface, so
 * the state hook and UI do not care which one is active.
 */
export interface SongLibraryStore {
  kind: SongLibraryStoreKind;
  getFavorites(): Promise<string[]>;
  setFavorites(songIds: string[]): Promise<string[]>;
  listPlaylists(): Promise<LibraryPlaylist[]>;
  createPlaylist(input: PlaylistInput): Promise<LibraryPlaylist>;
  /** Only own playlists can be changed; null when the playlist is unknown. */
  updatePlaylist(id: string, patch: Partial<PlaylistInput>): Promise<LibraryPlaylist | null>;
  deletePlaylist(id: string): Promise<void>;
}

export type SongLibraryStoreKind = 'companion' | 'local';

export interface PlaylistInput {
  name: string;
  songs: string[];
  shared: boolean;
}

export const chooseLibraryStoreKind = (opts: {
  hasLocalFolder: boolean;
  companionActive: boolean;
}): SongLibraryStoreKind => (opts.companionActive && !opts.hasLocalFolder ? 'companion' : 'local');

type Fetcher = <T>(path: string, init?: RequestInit) => Promise<T>;

const BASE = '/api/melodiq/library';

/** Companion server store: `/api/melodiq/library/*`, owned by the API user of the token. */
export function createCompanionLibraryStore(fetcher: Fetcher): SongLibraryStore {
  const send = <T>(path: string, method: string, body?: unknown) =>
    fetcher<T>(`${BASE}${path}`, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  return {
    kind: 'companion',
    getFavorites: async () => (await fetcher<{ songIds: string[] }>(`${BASE}/favorites`)).songIds,
    setFavorites: async (songIds) =>
      (await send<{ songIds: string[] }>('/favorites', 'PUT', { songIds })).songIds,
    listPlaylists: () => fetcher<LibraryPlaylist[]>(`${BASE}/playlists`),
    createPlaylist: (input) => send<LibraryPlaylist>('/playlists', 'POST', input),
    updatePlaylist: (id, patch) =>
      send<LibraryPlaylist>(`/playlists/${encodeURIComponent(id)}`, 'PUT', patch),
    deletePlaylist: async (id) => {
      await send(`/playlists/${encodeURIComponent(id)}`, 'DELETE');
    },
  };
}

/** The part of the Dexie `playlists` table the local store uses. */
export interface PlaylistTable {
  toArray(): Promise<Playlist[]>;
  get(id: string): Promise<Playlist | undefined>;
  put(playlist: Playlist): Promise<unknown>;
  delete(id: string): Promise<void>;
}

export interface LocalLibraryDeps {
  /** Favourites as a JSON array (a `storage.ts` key). */
  favorites: { get(): string | null; set(value: string): void };
  playlists: PlaylistTable;
  newId(): string;
  now?(): number;
}

const parseIds = (raw: string | null): string[] => {
  try {
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
};

/** Device-only playlists are never shared; entries cached from an old server sync stay read-only. */
const toLibrary = (p: Playlist): LibraryPlaylist => ({
  id: p.id,
  name: p.name,
  songs: p.songs,
  shared: false,
  mine: !p.isGlobal,
  updatedAt: p.updatedAt,
});

/** Local store: favourites in `storage.ts`, playlists in the existing Dexie `playlists` table. */
export function createLocalLibraryStore(deps: LocalLibraryDeps): SongLibraryStore {
  const now = deps.now ?? Date.now;
  return {
    kind: 'local',
    getFavorites: async () => parseIds(deps.favorites.get()),
    setFavorites: async (songIds) => {
      deps.favorites.set(JSON.stringify(songIds));
      return songIds;
    },
    listPlaylists: async () => (await deps.playlists.toArray()).map(toLibrary),
    createPlaylist: async ({ name, songs }) => {
      const playlist: Playlist = { id: deps.newId(), name, songs, updatedAt: now() };
      await deps.playlists.put(playlist);
      return toLibrary(playlist);
    },
    updatePlaylist: async (id, patch) => {
      const current = await deps.playlists.get(id);
      if (!current || current.isGlobal) return null;
      const next: Playlist = {
        ...current,
        name: patch.name ?? current.name,
        songs: patch.songs ?? current.songs,
        updatedAt: now(),
      };
      await deps.playlists.put(next);
      return toLibrary(next);
    },
    deletePlaylist: (id) => deps.playlists.delete(id),
  };
}
