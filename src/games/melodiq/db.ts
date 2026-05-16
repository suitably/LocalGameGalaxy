import Dexie, { type EntityTable } from 'dexie';

export interface Song {
    id: string; // hash or unique identifier
    libraryId?: string; // ID of the library this song belongs to
    title: string;
    artist: string;
    cover?: string | Blob | FileSystemFileHandle; 
    background?: string | Blob | FileSystemFileHandle; 
    audio?: string | Blob | FileSystemFileHandle; 
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
    title: string;
    artist: string;
    duration?: number;
    year?: string;
    genre?: string;
    language?: string;
    edition?: string;
    album?: string;
    cover?: string | Blob | FileSystemFileHandle; 
    hasCover: boolean;  
    hasVideo: boolean;  
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
    scores: EntityTable<Score, 'id'>
};

// Version 9: Removed all local song library tables (songs, songsMeta, songsContent, cachedDirs, libraries)
db.version(9).stores({
    scores: '++id, songId, profileId, score, date, difficulty'
});

export default db;

// Dummy cache function to avoid breaking MelodiqSession which used it for legacy browser imports
export const getCachedFiles = (_songId: string): any | undefined => {
    return undefined;
};
export const setCachedFiles = (_songId: string, _files: any): void => {};
export const clearFileCache = (): void => {};
