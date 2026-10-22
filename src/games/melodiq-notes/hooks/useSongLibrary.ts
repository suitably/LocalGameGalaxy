import { useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../logic/db';
import {
  supportsDirectoryPicker,
  pickAndSyncFolder,
  resyncAllFolders,
  syncFilesFromInput,
  removeFolder,
} from '../logic/folderSync';

/** Local sheet-music library (IndexedDB) and the folder-sync actions that fill it. */
export const useSongLibrary = () => {
  const librarySongs =
    useLiveQuery(() => db.songs.orderBy('addedAt').reverse().toArray(), []) ?? [];
  const storedFolders = useLiveQuery(() => db.folders.toArray(), []) ?? [];
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const runSync = useCallback(async (task: () => Promise<unknown>) => {
    setIsSyncing(true);
    try {
      await task();
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleFolderFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      await runSync(() => syncFilesFromInput(files));
    },
    [runSync],
  );

  return {
    librarySongs,
    storedFolders,
    isSyncing,
    supportsDirectoryPicker: supportsDirectoryPicker(),
    handleSyncFolder: () => runSync(pickAndSyncFolder),
    handleResyncFolders: () => runSync(resyncAllFolders),
    handleFolderFileInput,
    handleRemoveFolder: removeFolder,
  };
};
