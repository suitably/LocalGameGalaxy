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
    handle: FileSystemDirectoryHandle;
    stats?: ImportStats;
    logs?: string[];
    lastScanned?: number;
}

const db = new Dexie('MelodiqDB') as Dexie & {
    songs: EntityTable<Song, 'id'>,
    songsContent: EntityTable<SongContent, 'id'>,
    cachedDirs: EntityTable<CachedDir, 'path'>,
    libraries: EntityTable<Library, 'id'>
};

// Update to version 6 to include libraries and song.libraryId
db.version(6).stores({
    songs: 'id, libraryId, title, artist, year, genre, language',
    songsContent: 'id',
    cachedDirs: 'path',
    libraries: 'id'
});

export { db };
