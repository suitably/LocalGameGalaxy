import { useState, useEffect, useCallback, useRef } from 'react';
import db from '../db';
import {
    scanLocalDirectory,
    revokeLocalCoverUrls,
    type LocalSong,
    type ScanProgress
} from '../logic/localLibraryProvider';

export type FolderPermissionStatus = 'granted' | 'prompt' | 'denied' | 'none';

export interface UseLocalLibraryResult {
    isSupported: boolean;
    hasFolder: boolean;
    folderName: string | null;
    permissionStatus: FolderPermissionStatus;
    isScanning: boolean;
    scanProgress: ScanProgress | null;
    localSongs: LocalSong[];
    selectFolder: () => Promise<boolean>;
    requestFolderPermission: () => Promise<boolean>;
    rescanFolder: () => Promise<void>;
    disconnectFolder: () => Promise<void>;
}

const STORAGE_FOLDER_ID = 'melodiq_local_library';

export function useLocalLibrary(): UseLocalLibraryResult {
    const isSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

    const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);
    const [folderName, setFolderName] = useState<string | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<FolderPermissionStatus>(
        isSupported ? 'none' : 'none'
    );
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
    const [localSongs, setLocalSongs] = useState<LocalSong[]>([]);

    const scanInProgressRef = useRef(false);

    const performScan = useCallback(async (dirHandle: FileSystemDirectoryHandle) => {
        if (scanInProgressRef.current) return;
        scanInProgressRef.current = true;
        setIsScanning(true);
        setScanProgress({ scannedFolders: 0, scannedFiles: 0, foundSongs: 0 });

        try {
            console.log(`[useLocalLibrary] Scanning directory: ${dirHandle.name}...`);
            const songs = await scanLocalDirectory(dirHandle, (p) => {
                setScanProgress(p);
            });
            console.log(`[useLocalLibrary] Scan complete: ${songs.length} songs found.`);
            setLocalSongs(songs);
        } catch (err) {
            console.error('[useLocalLibrary] Error during directory scan:', err);
        } finally {
            setIsScanning(false);
            scanInProgressRef.current = false;
        }
    }, []);

    // Load persisted handle on initial mount
    useEffect(() => {
        if (!isSupported) return;

        let mounted = true;

        const restoreHandle = async () => {
            try {
                const stored = await db.folderHandles.get(STORAGE_FOLDER_ID);
                if (!stored || !stored.handle || !mounted) return;

                setFolderHandle(stored.handle);
                setFolderName(stored.name);

                // @ts-ignore - queryPermission is standard on FileSystemHandle
                const perm: PermissionState = await stored.handle.queryPermission({ mode: 'read' });
                if (!mounted) return;
                setPermissionStatus(perm as FolderPermissionStatus);

                if (perm === 'granted') {
                    await performScan(stored.handle);
                }
            } catch (err) {
                console.warn('[useLocalLibrary] Failed to restore folder handle from IndexedDB:', err);
            }
        };

        restoreHandle();

        return () => {
            mounted = false;
        };
    }, [isSupported, performScan]);

    const selectFolder = useCallback(async (): Promise<boolean> => {
        if (!isSupported) {
            console.warn('[useLocalLibrary] File System Access API is not supported in this browser');
            return false;
        }

        try {
            // @ts-ignore - showDirectoryPicker on window
            const handle: FileSystemDirectoryHandle = await window.showDirectoryPicker({
                id: 'melodiq_local_songs',
                mode: 'read'
            });

            if (!handle) return false;

            // Save to IndexedDB
            await db.folderHandles.put({
                id: STORAGE_FOLDER_ID,
                handle,
                name: handle.name,
                updatedAt: Date.now()
            });

            setFolderHandle(handle);
            setFolderName(handle.name);
            setPermissionStatus('granted');

            await performScan(handle);
            return true;
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                console.error('[useLocalLibrary] Failed to select folder:', err);
            }
            return false;
        }
    }, [isSupported, performScan]);

    const requestFolderPermission = useCallback(async (): Promise<boolean> => {
        if (!folderHandle) return false;

        try {
            // @ts-ignore - requestPermission on FileSystemHandle
            const perm: PermissionState = await folderHandle.requestPermission({ mode: 'read' });
            setPermissionStatus(perm as FolderPermissionStatus);

            if (perm === 'granted') {
                await performScan(folderHandle);
                return true;
            }
            return false;
        } catch (err) {
            console.error('[useLocalLibrary] Failed to request folder permission:', err);
            return false;
        }
    }, [folderHandle, performScan]);

    const rescanFolder = useCallback(async (): Promise<void> => {
        if (folderHandle && permissionStatus === 'granted') {
            await performScan(folderHandle);
        }
    }, [folderHandle, permissionStatus, performScan]);

    const disconnectFolder = useCallback(async (): Promise<void> => {
        revokeLocalCoverUrls();
        try {
            await db.folderHandles.delete(STORAGE_FOLDER_ID);
        } catch (e) {
            console.warn('[useLocalLibrary] Failed to delete folder handle:', e);
        }
        setFolderHandle(null);
        setFolderName(null);
        setPermissionStatus('none');
        setLocalSongs([]);
    }, []);

    return {
        isSupported,
        hasFolder: Boolean(folderHandle),
        folderName,
        permissionStatus,
        isScanning,
        scanProgress,
        localSongs,
        selectFolder,
        requestFolderPermission,
        rescanFolder,
        disconnectFolder
    };
}
