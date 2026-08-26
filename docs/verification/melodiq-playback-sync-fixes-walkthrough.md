# Verification Walkthrough: PR 1 - Melodiq Playback & Session Stabilität [ID: VERIFY-MELODIQ-PLAYBACK-SYNC]

## Changes Implemented

1. **Storage & State Isolation (Issue #20)**:
   - Added `STORAGE_KEYS.CURRENT_SONG_PARTICIPANTS` to [`storage.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/lib/storage.ts).
   - Removed destructive writes to `melodiq_active_session` from `toggleQueueParticipant` and `reorderQueueParticipant` in [`useQueue.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/hooks/useQueue.ts).
   - Updated [`MelodiqGame.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/MelodiqGame.tsx) so live participant overrides during a song are saved under `CURRENT_SONG_PARTICIPANTS` without corrupting the persistent lobby active player list.

2. **Same-Song Consecutive Playback Lifecycle (Issue #87)**:
   - Updated [`MelodiqGame.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/MelodiqGame.tsx) to generate and increment a `sessionInstanceId` on every song selection / transition.
   - Updated [`PlaybackManager.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/components/PlaybackManager.tsx) to mount `MelodiqSession` using `key={`${selectedSong.id}-${playbackId}-${sessionInstanceId}`}`, ensuring clean remount and state initialization when the same song is played consecutively.
   - Fixed `initialTime` calculation so normal queue plays always start at `0:00`, and ensured `melodiq_saved_time` is reliably cleared from localStorage on skip / next / session exit.

3. **Audio & Lyrics Synchronization (Issue #88)**:
   - Updated [`MelodiqSession.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/MelodiqSession.tsx) to await the `loadedmetadata` event before applying `initialTime` to `audioRef.current`, preventing browsers from resetting the timestamp to 0 upon play start.
   - Updated [`usePlaybackControls.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/hooks/usePlaybackControls.ts) inside `safePlay` to synchronize `vocalsRef.current.currentTime` and `videoRef.current.currentTime` with `audioRef.current.currentTime` before triggering playback.

## Verification Results

### Compiler & Bundler Validation
Executed `npm run build` (`tsc -b && vite build`):
```bash
vite v7.3.0 building client environment for production...
✓ 1398 modules transformed.
✓ built in 24.95s
```
Result: **SUCCESS (0 errors)**.

### ESLint Validation
Executed `npm run lint`:
Result: **SUCCESS (0 errors)**.

## Summary of Addressed Issues
- **Issue #87**: [Feedback] bug: Selber Song hintereinander — RESOLVED.
- **Issue #88**: [Feedback] Play Pause Lyric async — RESOLVED.
- **Issue #20**: [HIGH] Conflicting Contract and State Corruption on localStorage Key melodiq_active_session — RESOLVED.
