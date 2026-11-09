import Dexie, { type EntityTable } from 'dexie';

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

/** A sheet-music file that has been imported from the local file system. */
export interface StoredSheetMusic {
    /** UUID, generated on import. */
    id: string;
    title: string;
    artist: string;
    /** Detected or inferred BPM from the score. */
    baseBpm: number;
    /** MusicXML text of a .xml / .musicxml file. Older rows hold the text of an extracted .mxl too. */
    xmlContent?: string;
    /** The file as read, for .mid / .midi / .gp / .mxl (#697). Either this or `xmlContent` is set. */
    scoreData?: ArrayBuffer;
    /** Original file name, for display purposes. */
    fileName: string;
    /** ID of the folder this song came from, if any. */
    folderId?: string;
    addedAt: number;
    stems?: Partial<Record<string, string>>;
    sync_offset_ms?: number;
}

/** A directory handle persisted in IDB so the user can re-sync without re-picking. */
export interface StoredFolderHandle {
    /** UUID generated on first pick. */
    id: string;
    handle: FileSystemDirectoryHandle;
    name: string;
    updatedAt: number;
}

// ---------------------------------------------------------------------------
// Database definition
// ---------------------------------------------------------------------------

type MelodiqNotesDatabase = Dexie & {
    songs: EntityTable<StoredSheetMusic, 'id'>;
    folders: EntityTable<StoredFolderHandle, 'id'>;
};

const db = new Dexie('MelodiqNotesDB') as MelodiqNotesDatabase;

db.version(1).stores({
    songs: 'id, title, artist, folderId, addedAt',
    folders: 'id, name, updatedAt',
});

export { db };
