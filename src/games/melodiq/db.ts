import Dexie, { type EntityTable } from 'dexie';

export interface Song {
    id: string; // hash or unique identifier
    title: string;
    artist: string;
    cover?: string | Blob; // stored as Blob or URL
    background?: string; // stored as Blob or URL
    audio?: string | Blob | FileSystemFileHandle; // stored as Blob or URL (mp3, ogg, wav, etc.) or FileHandle
    video?: string | Blob | FileSystemFileHandle; // stored as Blob or URL or FileHandle
    txtContent: string; // The raw or parsed content
    dirPath: string; // Handle to the directory if available, or just path string
    updatedAt: number;
    duration?: number; // Duration in seconds
    year?: string;
    genre?: string;
    language?: string;
    edition?: string;
    album?: string;
}

export interface CachedDir {
    path: string; // Identifier for the directory
    lastModified: number;
    songCount: number;
    songs: string[]; // List of song IDs
}

const db = new Dexie('MelodiqDB') as Dexie & {
    songs: EntityTable<Song, 'id'>,
    cachedDirs: EntityTable<CachedDir, 'path'>
};

// Update to version 4 to include new indices
db.version(4).stores({
    songs: 'id, title, artist, year, genre, language',
    cachedDirs: 'path'
});

export { db };
