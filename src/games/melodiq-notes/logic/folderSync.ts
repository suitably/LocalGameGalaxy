/**
 * Folder-sync for MelodiQ Notes.
 *
 * Provides two complementary entry points:
 *   1. `pickAndSyncFolder()` — uses the File System Access API (modern browsers).
 *   2. `syncFilesFromInput()` — accepts a FileList from an <input webkitdirectory> (fallback).
 *
 * Both functions scan the picked tree for .xml / .musicxml / .mxl / .mid / .gp files, read them
 * via `readScoreFile` (through `storedSongFromScore`), persist results in the Dexie DB, and
 * return the list of successfully imported songs.
 */

import { v4 as uuidv4 } from 'uuid';
import { isScoreFileName, storedSongFromScore } from './deviceSong';
import { db, type StoredSheetMusic, type StoredFolderHandle } from './db';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Converts a browser File handle to a StoredSheetMusic row.
 * Returns `null` when the file cannot be parsed (logged, not thrown).
 */
async function fileToStoredSong(
    file: File,
    folderId?: string,
): Promise<StoredSheetMusic | null> {
    try {
        return storedSongFromScore(file.name, await file.arrayBuffer(), {
            id: uuidv4(),
            folderId,
            addedAt: Date.now(),
        });
    } catch (err) {
        console.warn(`[MelodiqNotes] Could not parse "${file.name}":`, err);
        return null;
    }
}

/**
 * Cross-browser helper: returns an async iterable of [name, handle] entries.
 * `FileSystemDirectoryHandle` has `.entries()` in Chromium but the TS DOM lib
 * does not yet expose it, so we cast via a local interface.
 */
interface DirectoryHandleWithEntries {
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
}

/**
 * Recursively walks a FileSystemDirectoryHandle and yields every File whose
 * name matches a supported sheet-music extension.
 */
async function* walkDirectory(
    dirHandle: FileSystemDirectoryHandle,
): AsyncGenerator<File> {
    const iterable = (dirHandle as unknown as DirectoryHandleWithEntries).entries();
    for await (const [, entry] of iterable) {
        if (entry.kind === 'file') {
            if (isScoreFileName(entry.name)) {
                yield await (entry as FileSystemFileHandle).getFile();
            }
        } else if (entry.kind === 'directory') {
            yield* walkDirectory(entry as FileSystemDirectoryHandle);
        }
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Returns `true` when the File System Access API is available. */
export function supportsDirectoryPicker(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof (
            window as unknown as { showDirectoryPicker?: unknown }
        ).showDirectoryPicker === 'function'
    );
}

export interface SyncResult {
    imported: StoredSheetMusic[];
    /** Number of files skipped due to parse errors. */
    skipped: number;
}

/**
 * Opens a system directory picker, persists the handle for future re-syncs,
 * and imports all sheet-music files found in the tree.
 *
 * Existing songs from the same folder are replaced so the library stays
 * up-to-date on each sync.
 */
export async function pickAndSyncFolder(): Promise<SyncResult> {
    const windowWithPicker = window as unknown as {
        showDirectoryPicker: (opts: { mode: string }) => Promise<FileSystemDirectoryHandle>;
    };
    const dirHandle = await windowWithPicker.showDirectoryPicker({ mode: 'read' });

    // Persist / update the handle for re-sync.
    const existingHandles = await db.folders.toArray();
    const existing = existingHandles.find(h => h.name === dirHandle.name);
    const folderId = existing?.id ?? uuidv4();

    const folderRecord: StoredFolderHandle = {
        id: folderId,
        handle: dirHandle,
        name: dirHandle.name,
        updatedAt: Date.now(),
    };
    await db.folders.put(folderRecord);

    return syncFromDirectoryHandle(dirHandle, folderId);
}

/**
 * Asks for read permission on a persisted handle. Browsers allow the prompt only while the
 * click that caused it is fresh, so call this synchronously from the click handler (#697).
 * `requestPermission` is a non-standard extension not yet in the TS DOM types.
 */
function requestReadPermission(handle: FileSystemDirectoryHandle): Promise<string> {
    type HandleWithPermission = { requestPermission: (opts: { mode: string }) => Promise<string> };
    return (handle as unknown as HandleWithPermission).requestPermission({ mode: 'read' });
}

/**
 * Re-syncs the given persisted folder handles (pass the already loaded list: reading the
 * database first would use up the click). Call it directly from a user gesture; every permission
 * prompt is raised before the first file is read. Silently skips handles whose permission was
 * denied or whose directory is gone. Handle persistence works in Chromium only.
 */
export async function resyncAllFolders(folders: readonly StoredFolderHandle[]): Promise<SyncResult> {
    const permissions = folders.map(folder => requestReadPermission(folder.handle).catch(() => 'denied'));
    const imported: StoredSheetMusic[] = [];
    let skipped = 0;

    for (const [index, folder] of folders.entries()) {
        try {
            if ((await permissions[index]) !== 'granted') continue;

            const result = await syncFromDirectoryHandle(folder.handle, folder.id);
            imported.push(...result.imported);
            skipped += result.skipped;

            await db.folders.update(folder.id, { updatedAt: Date.now() });
        } catch {
            console.warn(`[MelodiqNotes] Could not re-sync folder "${folder.name}".`);
        }
    }

    return { imported, skipped };
}

/**
 * Imports files from a FileList (produced by `<input webkitdirectory>`).
 * This is the fallback for browsers without showDirectoryPicker.
 */
export async function syncFilesFromInput(files: FileList): Promise<SyncResult> {
    const imported: StoredSheetMusic[] = [];
    let skipped = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!isScoreFileName(file.name)) continue;

        const song = await fileToStoredSong(file);
        if (song) {
            imported.push(song);
        } else {
            skipped++;
        }
    }

    if (imported.length > 0) {
        await db.songs.bulkPut(imported);
    }

    return { imported, skipped };
}

/**
 * Removes a folder and all songs associated with it from the database.
 */
export async function removeFolder(folderId: string): Promise<void> {
    await db.transaction('rw', db.songs, db.folders, async () => {
        await db.songs.where('folderId').equals(folderId).delete();
        await db.folders.delete(folderId);
    });
}

// ---------------------------------------------------------------------------
// Internal: shared sync logic
// ---------------------------------------------------------------------------

async function syncFromDirectoryHandle(
    dirHandle: FileSystemDirectoryHandle,
    folderId: string,
): Promise<SyncResult> {
    const imported: StoredSheetMusic[] = [];
    let skipped = 0;

    for await (const file of walkDirectory(dirHandle)) {
        const song = await fileToStoredSong(file, folderId);
        if (song) {
            imported.push(song);
        } else {
            skipped++;
        }
    }

    // Replace all existing songs from this folder atomically.
    await db.transaction('rw', db.songs, async () => {
        await db.songs.where('folderId').equals(folderId).delete();
        if (imported.length > 0) {
            await db.songs.bulkPut(imported);
        }
    });

    return { imported, skipped };
}
