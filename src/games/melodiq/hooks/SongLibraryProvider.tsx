import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import db from '../db';
import { melodiqFetch } from '../api/melodiqFetch';
import { generateUUID } from '../../../lib/uuid';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import {
  addSongIds,
  moveSongId,
  sortPlaylists,
  toggleFavorite as toggleId,
  type LibraryPlaylist,
} from '../logic/songLibrary';
import { SongLibraryContext, type SongLibraryState } from './useSongLibrary';
import {
  chooseLibraryStoreKind,
  createCompanionLibraryStore,
  createLocalLibraryStore,
  type PlaylistInput,
  type SongLibraryStore,
  type SongLibraryStoreKind,
} from '../logic/songLibraryStore';

const companionActive = () => storage.isHelperActive() && Boolean(storage.getHelperUrl());

function createStore(kind: SongLibraryStoreKind): SongLibraryStore {
  if (kind === 'companion') return createCompanionLibraryStore(melodiqFetch);
  return createLocalLibraryStore({
    favorites: {
      get: () => storage.get(STORAGE_KEYS.MELODIQ_FAVORITES),
      set: (value) => storage.set(STORAGE_KEYS.MELODIQ_FAVORITES, value),
    },
    playlists: db.playlists,
    newId: generateUUID,
  });
}

interface LoadedLibrary {
  favorites: string[];
  playlists: LibraryPlaylist[];
}

/** Both lists from the store; null (logged) when loading fails. */
async function loadLibrary(store: SongLibraryStore): Promise<LoadedLibrary | null> {
  try {
    const [favorites, lists] = await Promise.all([store.getFavorites(), store.listPlaylists()]);
    return { favorites, playlists: sortPlaylists(lists) };
  } catch (e) {
    console.warn('[SongLibrary] Loading failed:', e);
    return null;
  }
}

/** Favourites and playlists (#636) from the companion (per API user) or this device. */
export const SongLibraryProvider: React.FC<{
  hasLocalFolder: boolean;
  children: React.ReactNode;
}> = ({ hasLocalFolder, children }) => {
  const [helperActive, setHelperActive] = useState(companionActive);
  const storeKind = chooseLibraryStoreKind({ hasLocalFolder, companionActive: helperActive });
  const store = useMemo(() => createStore(storeKind), [storeKind]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<LibraryPlaylist[]>([]);
  // Latest list for writes right after another write (e.g. create, then add songs) before a render
  const latest = useRef<LibraryPlaylist[]>([]);
  const latestFavorites = useRef<string[]>([]);
  const commit = useCallback((change: (all: LibraryPlaylist[]) => LibraryPlaylist[]) => {
    latest.current = sortPlaylists(change(latest.current));
    setPlaylists(latest.current);
  }, []);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const onSettings = () => setHelperActive(companionActive());
    window.addEventListener('melodiq_settings_updated', onSettings);
    return () => window.removeEventListener('melodiq_settings_updated', onSettings);
  }, []);

  const apply = useCallback(
    (loaded: LoadedLibrary | null) => {
      if (loaded) {
        latestFavorites.current = loaded.favorites;
        setFavorites(loaded.favorites);
        commit(() => loaded.playlists);
      }
      setIsLoading(false);
    },
    [commit],
  );

  const refresh = useCallback(async () => apply(await loadLibrary(store)), [apply, store]);

  useEffect(() => {
    let active = true;
    void loadLibrary(store).then((loaded) => active && apply(loaded));
    return () => {
      active = false;
    };
  }, [apply, store]);

  /** Runs a store write; on failure the stored state is reloaded. */
  const write = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
      try {
        return await action();
      } catch (e) {
        console.warn('[SongLibrary] Saving failed:', e);
        await refresh();
        return undefined;
      }
    },
    [refresh],
  );

  const update = useCallback(
    async (id: string, patch: (p: LibraryPlaylist) => Partial<PlaylistInput>) => {
      const current = latest.current.find((p) => p.id === id);
      if (!current?.mine) return;
      const next = { ...current, ...patch(current) };
      commit((all) => all.map((p) => (p.id === id ? next : p)));
      await write(() => store.updatePlaylist(id, patch(current)));
    },
    [commit, store, write],
  );

  const value = useMemo<SongLibraryState>(
    () => ({
      storeKind,
      isLoading,
      favorites,
      playlists,
      isFavorite: (songId) => favorites.includes(songId),
      toggleFavorite: async (songId) => {
        const next = toggleId(latestFavorites.current, songId);
        latestFavorites.current = next;
        setFavorites(next);
        await write(() => store.setFavorites(next));
      },
      refresh,
      createPlaylist: async (name, songs = []) => {
        const created = await write(() => store.createPlaylist({ name, songs, shared: false }));
        if (created) commit((all) => [...all, created]);
        return created?.id ?? '';
      },
      renamePlaylist: (id, name) => update(id, () => ({ name })),
      setPlaylistShared: (id, shared) => update(id, () => ({ shared })),
      deletePlaylist: async (id) => {
        commit((all) => all.filter((p) => p.id !== id));
        await write(() => store.deletePlaylist(id));
      },
      addSongsToPlaylist: (id, songIds) =>
        update(id, (p) => ({ songs: [...addSongIds(p.songs, songIds)] })),
      removeSongFromPlaylist: (id, songId) =>
        update(id, (p) => ({ songs: p.songs.filter((s) => s !== songId) })),
      moveSongInPlaylist: (id, from, to) =>
        update(id, (p) => ({ songs: moveSongId(p.songs, from, to) })),
    }),
    [storeKind, isLoading, favorites, playlists, refresh, store, update, write, commit],
  );

  return <SongLibraryContext.Provider value={value}>{children}</SongLibraryContext.Provider>;
};
