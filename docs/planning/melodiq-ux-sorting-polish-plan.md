# Implementation Plan: PR 2 - Melodiq UX Polish, Song Sorting & Current Singer Controls [ID: PLAN-MELODIQ-UX-POLISH]

## Goal Description
Enhance Melodiq's mobile and host user experience based on direct party playtest feedback:
1. **Issue #90**: Implement comprehensive mobile & host song catalog sorting (by Title, Artist, Year) in `useSearchFilters.tsx` and connect it to a mobile-friendly sort UI in `MelodiqSearchBar.tsx`.
2. **Issue #86**: Remove the redundant and confusing `Refresh` button from `useMelodiqHeader.tsx` to finalize the streamlined header.
3. **Issue #91**: Display the "Added by [Name]" requester label for the currently playing song in `HostQueueDrawer.tsx` and on the wait/session screen.
4. **Issue #85**: Support live re-assignment of participants and microphones during an active song in `useSessionPlayers.ts`.

## Proposed Changes

### 1. `src/games/melodiq/hooks/useSearchFilters.tsx` & `src/games/melodiq/components/MelodiqSearchBar.tsx`
- Add `sortOrder: 'title-asc' | 'title-desc' | 'artist-asc' | 'artist-desc' | 'year-desc' | 'year-asc'` to `useSearchFilters`.
- Apply sorting algorithm to `filteredSongs` and `filteredOnlineSongs`.
- Add sort selector / menu in `MelodiqSearchBar.tsx` with i18n localized labels.

### 2. `src/games/melodiq/hooks/useMelodiqHeader.tsx`
- Remove the `Refresh` button from `headerActions` in `useMelodiqHeader.tsx`.

### 3. `src/games/melodiq/components/HostQueueDrawer.tsx`
- In the `Now Playing` card, render `nowPlaying.requesterName` ("Hinzugefügt von [Name]" / "Added by [Name]").

### 4. `src/games/melodiq/gameplay/hooks/useSessionPlayers.ts`
- Enhance the reactive `useEffect` watching `activeSessionOverride` to update local mic allocations and player runtimes live during active singing.

### 5. `src/games/melodiq/i18n/index.ts`
- Add translation keys for sort options (`melodiq.sort_title_asc`, `melodiq.sort_artist_asc`, `melodiq.sort_year_desc`, etc.) in German and English.

## Verification Plan
1. **Song Sorting Verification**:
   - Open song catalog on phone and desktop.
   - Switch sort order between Title (A-Z), Artist (A-Z), Year (Newest), etc.
   - Verify song list updates immediately.
2. **Header Cleanup Verification**:
   - Verify header only contains essential action icons (Settings, QR code, TV mode if applicable) with no confusing refresh icon.
3. **Now Playing Requester Verification**:
   - Queue a song with a remote requester name.
   - Start the song and open the Host Queue Drawer.
   - Verify requester name is displayed in the "Now Playing" header.
4. **Live Singer Re-assignment Verification**:
   - Start a song, open current song participants dialog, toggle/reassign a singer.
   - Verify session continues seamlessly with the updated participant list.
5. **Lint & Build**:
   - Run `npm run lint` and `npm run build`.
