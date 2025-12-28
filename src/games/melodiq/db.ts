import Dexie, { type EntityTable } from 'dexie';

export interface Song {
    id: string; // hash or unique identifier
    title: string;
    artist: string;
    cover?: string; // stored as Blob or URL
    background?: string; // stored as Blob or URL
    audio?: string; // stored as Blob or URL (mp3, ogg, wav, etc.)
    video?: string; // stored as Blob or URL
    txtContent: string; // The raw or parsed content
    dirPath: string; // Handle to the directory if available, or just path string
    updatedAt: number;
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

db.version(1).stores({
    songs: 'id, title, artist',
    cachedDirs: 'path'
});

export { db };
