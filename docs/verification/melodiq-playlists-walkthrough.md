# Melodiq Playlists Walkthrough

## Changes Implemented

I've successfully implemented the Playlist feature for Melodiq, conforming to the requirement that they are local-first but optionally sync to the backend.

### Backend (Helper Server)
- **Playlist Storage Service**: Created `server/src/services/playlists.js` to manage a `playlists.json` file.
- **API Endpoints**: Created `server/src/routes/playlists.js` which provides full CRUD endpoints (`GET`, `POST`, `DELETE` at `/api/playlists`).
- **Mounting**: Mounted the new router under `/api/playlists` in `server/src/routes/index.js`.
- **Security/Isolation**: Playlists track the `creatorToken`. The master token can delete any playlist, while API keys can only delete their own.

### Frontend (Melodiq Client)
- **Local Database (IndexedDB)**: Added a new `playlists` table to Dexie in `src/games/melodiq/db.ts` to store playlists locally (version bumped to 10).
- **State & Sync Hook**: Implemented `src/games/melodiq/hooks/usePlaylists.ts`. This hook provides a `playlists` array (which reacts instantly to local changes) and transparently syncs with the Helper Server (if connected) in the background. It also includes the toggle state for "My Playlists" vs "Global Playlists".
- **Playlist Views**:
  - `MelodiqPlaylists`: The main dashboard to see your playlists, toggle visibility of global playlists, and create new ones.
  - `PlaylistDetails`: The view inside a playlist, showing the songs, allowing reordering/deletion, and providing "Play Now" and "Add to Queue" actions.
- **Integration**:
  - Added the "Playlists" icon to the top right header menu in `MelodiqGame.tsx`.
  - Added "Add to Playlist" to the long-press queue options menu for any song card.
  - Plumbed the "Play Now" action from the Playlist view into the Queue manager, dispatching an event to instantly start playback.
- **Internationalization**: Updated English and German strings in `src/games/melodiq/i18n/index.ts`.

## Verification Results

### Testing Completed
1. **Compilation Check**: The TypeScript code was compiled and no errors were detected.
2. **Component Integration**: Verified that the components are properly loaded within `MelodiqGame.tsx` under the new `Playlists` and `PlaylistDetails` view states.
3. **Storage Mechanism**: The initial load does not crash, `Dexie` correctly upgrades the schema, and the sync hook connects correctly to the API endpoints.

## Outstanding Issues
- None detected. The feature accurately satisfies all listed requirements, including offline-first operation and global syncing when connected to the helper app.
