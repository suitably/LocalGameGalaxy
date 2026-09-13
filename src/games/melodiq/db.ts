import Dexie, { type EntityTable } from 'dexie';

export interface Playlist {
    id: string; // uuid
    name: string;
    songs: string[]; // array of song IDs
    creatorToken?: string; // backend token that created it, if any
    isGlobal?: boolean; // if fetched from backend and creatorToken != currentToken
    updatedAt: number;
}

export interface Song {
    id: string; // hash or unique identifier
    libraryId?: string; // ID of the library this song belongs to
    source?: 'server' | 'local';
    title: string;
    artist: string;
    bpm?: number;
    gap?: number;
    hasCover?: boolean;
    hasVideo?: boolean;
    cover?: string | Blob | FileSystemFileHandle; 
    background?: string | Blob | FileSystemFileHandle; 
    audio?: string | Blob | FileSystemFileHandle; 
    originalAudio?: string | Blob | FileSystemFileHandle; 
    instrumentalAudio?: string | Blob | FileSystemFileHandle; 
    vocalsAudio?: string | Blob | FileSystemFileHandle; 
    hasSeparation?: boolean;
    video?: string | Blob | FileSystemFileHandle; 
    dirPath?: string; 
    updatedAt?: number;
    duration?: number; 
    year?: string;
    genre?: string;
    language?: string;
    edition?: string;
    album?: string;
    txtContent?: string;
}

export interface SongMeta {
    id: string;
    libraryId?: string;
    source?: 'server' | 'local';
    title: string;
    artist: string;
    duration?: number;
    year?: string;
    genre?: string;
    language?: string;
    edition?: string;
    album?: string;
    cover?: string | Blob | FileSystemFileHandle; 
    video?: string | Blob | FileSystemFileHandle;
    audio?: string | Blob | FileSystemFileHandle;
    originalAudio?: string | Blob | FileSystemFileHandle;
    instrumentalAudio?: string | Blob | FileSystemFileHandle;
    vocalsAudio?: string | Blob | FileSystemFileHandle;
    hasSeparation?: boolean;
    hasCover?: boolean;  
    hasVideo?: boolean;
    usdbId?: number;
    txtPath?: string;
    isDownloading?: boolean;
    jobId?: string;
    requester?: string;
    requesterId?: string;
}

export interface Score {
    id?: number;
    songId: string;
    profileId: string;
    score: number;
    date: string;
    difficulty?: string;
}

export interface StoredDirectoryHandle {
    id: string;
    handle: FileSystemDirectoryHandle;
    name: string;
    updatedAt: number;
}

const db = new Dexie('MelodiqDB') as Dexie & {
    scores: EntityTable<Score, 'id'>,
    playlists: EntityTable<Playlist, 'id'>,
    folderHandles: EntityTable<StoredDirectoryHandle, 'id'>
};

// Version 10: Added playlists table
db.version(10).stores({
    scores: '++id, songId, profileId, score, date, difficulty',
    playlists: 'id, name, creatorToken, isGlobal, updatedAt'
}).upgrade(() => {
    // Initialization for upgrade if needed
});

// Version 11: Added folderHandles table for File System Access API Lite mode
db.version(11).stores({
    folderHandles: 'id, name, updatedAt'
});

export default db;

// Dummy cache function to avoid breaking MelodiqSession which used it for legacy browser imports
export const getCachedFiles = (_songId: string): Record<string, File | Blob> | undefined => {
    return undefined;
};
export const setCachedFiles = (_songId: string, _files: Record<string, unknown>): void => {};
export const clearFileCache = (): void => {};
