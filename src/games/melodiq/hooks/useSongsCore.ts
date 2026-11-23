import { createContext, useContext } from 'react';
import type { Song, SongMeta } from '../db';
import type { UseLocalLibraryResult } from './useLocalLibrary';

export interface LoadingProgress {
  loaded: number;
  total: number;
}

export interface UseSongsResult {
  songs: SongMeta[];
  isLoading: boolean;
  hasConnectionError: boolean;
  loadingProgress: LoadingProgress | null;
  refreshSongs: () => Promise<void>;
  getSongById: (id: string) => Promise<Song | undefined>;
  localLibrary: UseLocalLibraryResult;
}

export const SongsContext = createContext<UseSongsResult | null>(null);

export const useSongs = (): UseSongsResult => {
  const context = useContext(SongsContext);
  if (!context) {
    throw new Error('useSongs must be used within a SongsProvider');
  }
  return context;
};
