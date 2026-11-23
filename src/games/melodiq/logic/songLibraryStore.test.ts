import { describe, expect, it, vi } from 'vitest';
import type { Playlist } from '../db';
import {
  chooseLibraryStoreKind,
  createCompanionLibraryStore,
  createLocalLibraryStore,
  type PlaylistTable,
} from './songLibraryStore';

const memoryTable = (initial: Playlist[] = []): PlaylistTable => {
  const rows = new Map(initial.map((p) => [p.id, p]));
  return {
    toArray: async () => [...rows.values()],
    get: async (id) => rows.get(id),
    put: async (p) => rows.set(p.id, p),
    delete: async (id) => {
      rows.delete(id);
    },
  };
};

describe('chooseLibraryStoreKind', () => {
  it('uses the companion only without a local folder', () => {
    expect(chooseLibraryStoreKind({ hasLocalFolder: false, companionActive: true })).toBe(
      'companion',
    );
    expect(chooseLibraryStoreKind({ hasLocalFolder: true, companionActive: true })).toBe('local');
    expect(chooseLibraryStoreKind({ hasLocalFolder: false, companionActive: false })).toBe('local');
  });
});

describe('createCompanionLibraryStore', () => {
  it('calls the per-user library routes', async () => {
    const fetcher = vi.fn(async (path: string) =>
      path.endsWith('/favorites') ? { songIds: ['a'] } : { id: 'p1' },
    );
    const store = createCompanionLibraryStore(fetcher as never);
    expect(await store.getFavorites()).toEqual(['a']);
    await store.setFavorites(['a', 'b']);
    expect(fetcher).toHaveBeenLastCalledWith('/api/melodiq/library/favorites', {
      method: 'PUT',
      body: JSON.stringify({ songIds: ['a', 'b'] }),
    });
    await store.updatePlaylist('p 1', { shared: true });
    expect(fetcher).toHaveBeenLastCalledWith('/api/melodiq/library/playlists/p%201', {
      method: 'PUT',
      body: JSON.stringify({ shared: true }),
    });
    await store.deletePlaylist('p1');
    expect(fetcher).toHaveBeenLastCalledWith('/api/melodiq/library/playlists/p1', {
      method: 'DELETE',
      body: undefined,
    });
  });
});

describe('createLocalLibraryStore', () => {
  const setup = (rows: Playlist[] = []) => {
    let raw: string | null = null;
    const store = createLocalLibraryStore({
      favorites: { get: () => raw, set: (v) => (raw = v) },
      playlists: memoryTable(rows),
      newId: () => 'new',
      now: () => 42,
    });
    return { store, raw: () => raw };
  };

  it('keeps favourites as JSON and tolerates broken values', async () => {
    const { store, raw } = setup();
    expect(await store.getFavorites()).toEqual([]);
    await store.setFavorites(['x']);
    expect(raw()).toBe('["x"]');
    expect(await store.getFavorites()).toEqual(['x']);
  });

  it('creates, updates and deletes device playlists; old synced copies stay read-only', async () => {
    const { store } = setup([{ id: 'old', name: 'Old', songs: [], isGlobal: true, updatedAt: 1 }]);
    const created = await store.createPlaylist({ name: 'Mine', songs: ['a'], shared: true });
    expect(created).toEqual({
      id: 'new',
      name: 'Mine',
      songs: ['a'],
      shared: false,
      mine: true,
      updatedAt: 42,
    });
    expect((await store.updatePlaylist('new', { songs: ['a', 'b'] }))?.songs).toEqual(['a', 'b']);
    expect(await store.updatePlaylist('old', { name: 'x' })).toBeNull();
    expect((await store.listPlaylists()).find((p) => p.id === 'old')?.mine).toBe(false);
    await store.deletePlaylist('new');
    expect((await store.listPlaylists()).map((p) => p.id)).toEqual(['old']);
  });
});
