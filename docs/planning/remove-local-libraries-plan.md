# Goal: Remove Browser-Based Local Song Libraries

The goal is to remove the browser-based `Local Song Libraries` feature (which used the File System Access API and IndexedDB to store songs locally in the browser). As discussed, the `Melodiq Helper` (local Node.js server) is the preferred, more robust, and simpler way to serve songs for the game. Removing the browser-based library will significantly reduce code complexity, avoid browser storage limits, and remove the need to maintain two parallel syncing implementations.

## Proposed Changes

### Melodiq Game Core

#### [DELETE] src/games/melodiq/components/LibraryManager.tsx
- This component provided the UI for selecting local browser folders and triggering the import. It is no longer needed.

#### [DELETE] src/games/melodiq/importer.ts
- This file contained the logic for parsing Ultrastar `.txt` files directly in the browser and reading `FileSystemDirectoryHandle` directories. The Helper does this now.

#### [MODIFY] src/games/melodiq/MelodiqSettings.tsx
- Remove the import and usage of `<LibraryManager />`.

#### [MODIFY] src/games/melodiq/hooks/useSongs.tsx
- Remove all logic that queries `db.songsMeta`, `db.songs`, and `db.songsContent` from local IndexedDB.
- `useSongs` will now strictly rely on the `serverPromise` (fetching from the Melodiq Helper API).
- Remove the `getSongById` fallback to local IndexedDB.

#### [MODIFY] src/games/melodiq/db.ts
- Remove the `songs`, `songsMeta`, `songsContent`, `cachedDirs`, and `libraries` tables.
- Keep only the `scores` table (which is used for saving highscores).
- Remove `CachedFiles` logic, as the browser will no longer handle raw `File` objects from local inputs.
- Bump the database version (to version 9) so that existing browser clients automatically clean up the old schema.

## Verification Plan

### Automated Tests
- Run `npm run lint` and `npm run build` to ensure no lingering references to the deleted files exist.

### Manual Verification
- Start the game (`npm run dev`) and navigate to Settings. Ensure the "Local Song Libraries" section is gone.
- Ensure the song list still populates correctly via the Helper.
- Check the browser console for any errors related to IndexedDB or missing dependencies.
