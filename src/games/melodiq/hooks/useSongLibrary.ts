import { createContext, useContext } from 'react';
import { type LibraryPlaylist } from '../logic/songLibrary';
import { type SongLibraryStoreKind } from '../logic/songLibraryStore';

/** Favourites and playlists of the song library (#636); provided by `SongLibraryProvider`. */
export interface SongLibraryState {
  storeKind: SongLibraryStoreKind;
  isLoading: boolean;
  favorites: string[];
  playlists: LibraryPlaylist[];
  isFavorite: (songId: string) => boolean;
  toggleFavorite: (songId: string) => Promise<void>;
  refresh: () => Promise<void>;
  createPlaylist: (name: string, songs?: string[]) => Promise<string>;
  renamePlaylist: (id: string, name: string) => Promise<void>;
  setPlaylistShared: (id: string, shared: boolean) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addSongsToPlaylist: (id: string, songIds: string[]) => Promise<void>;
  removeSongFromPlaylist: (id: string, songId: string) => Promise<void>;
  moveSongInPlaylist: (id: string, from: number, to: number) => Promise<void>;
}

export const SongLibraryContext = createContext<SongLibraryState | null>(null);

export const useSongLibrary = (): SongLibraryState => {
  const context = useContext(SongLibraryContext);
  if (!context) throw new Error('useSongLibrary must be used within a SongLibraryProvider');
  return context;
};
