import Dexie, { type EntityTable } from 'dexie';

import type { ImportStats } from './importer';

export interface Song {
    id: string; // hash or unique identifier
    libraryId?: string; // ID of the library this song belongs to
    title: string;
    artist: string;
    cover?: string | Blob | FileSystemFileHandle; // stored as Blob or URL or FileHandle
    background?: string | Blob | FileSystemFileHandle; // stored as Blob or URL or FileHandle
    audio?: string | Blob | FileSystemFileHandle; // stored as Blob or URL (mp3, ogg, wav, etc.) or FileHandle
    video?: string | Blob | FileSystemFileHandle; // stored as Blob or URL or FileHandle
    // txtContent moved to SongContent table
    dirPath: string; // Handle to the directory if available, or just path string
    updatedAt: number;
    duration?: number; // Duration in seconds
    year?: string;
    genre?: string;
    language?: string;
    edition?: string;
    album?: string;
}

/**
 * Lightweight song metadata for fast list rendering.
 * Does NOT include heavy file handles (audio, video, cover).
 */
export interface SongMeta {
    id: string;
    libraryId?: string;
    title: string;
    artist: string;
    duration?: number;
    year?: string;
    genre?: string;
    language?: string;
    edition?: string;
    album?: string;
    cover?: string | Blob | FileSystemFileHandle; // Optional, might be populated by useSongs (URL) or importer (Thumbnail)
    hasCover: boolean;  // Flag to indicate cover exists
    hasVideo: boolean;  // Flag to indicate video exists
}

export interface SongContent {
    id: string;
    txtContent: string;
}

export interface CachedDir {
    path: string; // Identifier for the directory
    lastModified: number;
    songCount: number;
    songs: string[]; // List of song IDs
}

export interface Library {
    id: string;
    name: string;
    handle?: FileSystemDirectoryHandle;
    stats?: ImportStats;
    logs?: string[];
    lastScanned?: number;
}

export interface Score {
    id?: number;
    songId: string;
    profileId: string;
    score: number;
    date: string;
    difficulty?: string;
}

const db = new Dexie('MelodiqDB') as Dexie & {
    songs: EntityTable<Song, 'id'>,
    songsMeta: EntityTable<SongMeta, 'id'>,
    songsContent: EntityTable<SongContent, 'id'>,
    cachedDirs: EntityTable<CachedDir, 'path'>,
    libraries: EntityTable<Library, 'id'>,
    scores: EntityTable<Score, 'id'>
};

// Update to version 8 to include scores table
db.version(8).stores({
    songs: 'id, libraryId, title, artist, year, genre, language',
    songsMeta: 'id, libraryId, title, artist, year, genre, language, edition',
    songsContent: 'id',
    cachedDirs: 'path',
    libraries: 'id',
    scores: '++id, songId, profileId, score, date, difficulty'
});

export default db;

/**
 * In-memory cache for File objects from FileList imports.
 * These can't be stored in IndexedDB without exceeding quota,
 * but we can keep them in memory for the current browser session.
 * After page refresh, files will need to be re-selected.
 */
export interface CachedFiles {
    audio?: File;
    video?: File;
    cover?: File;
}

const fileCache = new Map<string, CachedFiles>();

export const getCachedFiles = (songId: string): CachedFiles | undefined => {
    return fileCache.get(songId);
};

export const setCachedFiles = (songId: string, files: CachedFiles): void => {
    fileCache.set(songId, files);
};

export const clearFileCache = (): void => {
    fileCache.clear();
};
