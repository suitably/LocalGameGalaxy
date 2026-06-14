# Melodiq Playlists Feature

## Goal Description
Implement full playlist functionality for the Melodiq app. Playlists will be stored locally by default using IndexedDB (`dexie`). If the user is connected to a Helper Server, their playlists will automatically sync to the backend. Users will also be able to toggle between viewing "My Playlists" and "Global Playlists" (playlists created by other users on the same Helper Server).

## Proposed Changes

### Database & Storage (Client Side)
#### [MODIFY] `src/games/melodiq/db.ts`
- Add a new `playlists` table to the Dexie database.
- Define `Playlist` type:
  ```typescript
  export interface Playlist {
      id: string;          // UUID
      name: string;        // Playlist name
      songs: string[];     // Array of song IDs
      creatorToken?: string; // Token of the creator (for synced playlists)
      isGlobal?: boolean;  // True if it's a synced playlist created by someone else
      updatedAt: number;   // Timestamp for sync conflict resolution
  }
  ```

#### [NEW] `src/games/melodiq/hooks/usePlaylists.ts`
- Hook to manage local CRUD operations via `db.ts`.
- Implements background syncing logic:
  - When a local playlist is created/updated, push to Helper Server if connected.
  - On load, fetch playlists from Helper Server and update local DB (handling global vs. private).
- Provide a state toggle: `showGlobalPlaylists` vs `showMyPlaylists`.

### Frontend (Melodiq App)
#### [NEW] `src/games/melodiq/components/MelodiqPlaylists.tsx`
- New view component (`currentView === 'Playlists'`).
- UI to create new playlists.
- Toggle between "My Playlists" and "Global Playlists".
- List playlists and allow clicking to view details.

#### [NEW] `src/games/melodiq/components/PlaylistDetails.tsx`
- Component to view songs within a specific playlist.
- Allow removing songs.
- Actions: "Play Now" (replaces queue) and "Add to Queue" (appends).

#### [MODIFY] `src/games/melodiq/MelodiqGame.tsx`
- Add `Playlists` to the navigation menu.
- Add `Add to Playlist...` to the long-press menu of a song.

### Backend (Helper Server)
#### [NEW] `server/src/services/playlists.js`
- Reads/writes `playlists.json`.
- Functions to get, create, update, and delete playlists.

#### [NEW] `server/src/routes/playlists.js`
- `GET /api/playlists` -> returns all playlists.
- `POST /api/playlists` -> save/update a synced playlist.
- `DELETE /api/playlists/:id` -> remove a synced playlist.

#### [MODIFY] `server/index.js`
- Mount the new `/api/playlists` router.

## Verification Plan
### Manual Verification
1. Create a playlist without Helper Server connected -> Ensure it saves to IndexedDB.
2. Add songs to the playlist -> Ensure it saves.
3. Play the playlist -> Ensure it populates the queue.
4. Connect to Helper Server -> Ensure the playlist syncs to the backend.
5. Create a playlist with a different token (API Key) -> Ensure it appears under "Global Playlists" for the first user.
