# Host Queue Drawer

Add a queue management button to the MiniPlayer that opens a Spotify-style slide-up drawer showing the current queue. Users can reorder songs via drag-and-drop and remove items.

## Proposed Changes

### New Component

#### [NEW] [HostQueueDrawer.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/components/HostQueueDrawer.tsx)

A MUI `Drawer` anchored to the bottom that slides up when triggered. Contains:
- **Header**: "Queue" title with song count badge and a close button
- **Now Playing** section: shows the currently playing song (highlighted)
- **Up Next** list: scrollable list of queued songs with:
  - Drag handle icon for reordering (using HTML5 drag-and-drop)
  - Song title + artist text
  - Delete button per item
  - Visual drag feedback (elevation change, opacity)
- **Clear All** button when queue is non-empty
- **Empty state** message when queue is empty

Uses the existing `useQueue()` hook (`moveItem`, `removeFromQueue`, `clearQueue`).

---

### Modified Components

#### [MODIFY] [MiniPlayer.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/components/MiniPlayer.tsx)

Add a queue button (PlaylistPlay icon) to the MiniPlayer controls between the next button and the maximize button. Also add a badge showing queue length. Wire up `onShowQueue` callback.

**Interface change**: Add `onShowQueue: () => void` and `queueLength: number` to `MiniPlayerProps`.

#### [MODIFY] [PlaybackManager.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/components/PlaybackManager.tsx)

- Import `HostQueueDrawer`
- Add `showQueueDrawer` state
- Pass `onShowQueue` and `queueLength` to `MiniPlayer`  
- Render `<HostQueueDrawer>` with open/close state
- Pass queue data from existing `useQueue()` hook

## Verification Plan

### Manual Verification
1. Run `npm run dev` from project root
2. Open the Melodiq app in a browser
3. Add several songs to the queue
4. Start playing a song so the MiniPlayer appears at the bottom
5. Verify a **playlist icon button** appears in the MiniPlayer controls
6. Click the button → a **drawer slides up** from the bottom
7. Verify the drawer shows: Now Playing song, Up Next list with all queued songs
8. **Drag** a song to reorder → verify the queue updates
9. **Delete** a song → verify it is removed
10. **Clear All** → verify all songs are removed and empty state shows
11. Close drawer → verify it slides away
