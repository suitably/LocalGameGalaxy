# Implementation Plan: PR 1 - Melodiq Playback & Session Stabilität [ID: PLAN-MELODIQ-PLAYBACK-SYNC]

## Goal Description
Fix the three critical playback, queue, and state issues in Melodiq:
1. **Issue #87**: Playing the same song consecutively in queue causes stale state (doesn't start from 0:00, stays paused or glitches at song end).
2. **Issue #88**: Resuming or reloading a song causes lyrics to be desynchronized from the audio.
3. **Issue #20**: Conflict and state corruption where `melodiq_active_session` is improperly used/overwritten by both lobby active players and single-song queue participants.

## Proposed Changes

### 1. `src/lib/storage.ts`
- Add `STORAGE_KEYS.CURRENT_SONG_PARTICIPANTS` to strictly separate the global lobby active players from individual song participant overrides.

### 2. `src/games/melodiq/hooks/useQueue.ts`
- Remove all destructive writes to `melodiq_active_session` when toggling or reordering participants in upcoming queue items.
- Ensure queue item participants stay isolated within the `QueueItem` object.

### 3. `src/games/melodiq/MelodiqGame.tsx` & `src/games/melodiq/components/PlaybackManager.tsx`
- Introduce a unique `sessionInstanceId` (timestamp / incrementing counter) whenever a song is loaded or popped from the queue.
- Use this `sessionInstanceId` in the `MelodiqSession` key (`key={`${selectedSong.id}-${sessionInstanceId}`}`) to guarantee a complete clean remount when the same song is played consecutively.
- Clear `melodiq_saved_time` from localStorage upon clean song completion or skip to prevent the next song (with identical ID) from seeking to the previous song's timestamp.
- Store current song participant overrides under `STORAGE_KEYS.CURRENT_SONG_PARTICIPANTS` instead of overwriting `melodiq_active_session`.

### 4. `src/games/melodiq/gameplay/MelodiqSession.tsx` & `src/games/melodiq/gameplay/hooks/usePlaybackControls.ts`
- Fix audio ready-state handling for `initialTime`: Wait until `loadedmetadata` or `canplay` has fired on `audioRef` (and `vocalsRef`) before seeking to `initialTime` and auto-starting playback.
- Synchronize `vocalsRef.current.currentTime = audioRef.current.currentTime` before every `play()` in `safePlay` / `togglePlay`.
- Ensure clean state reset on unmount / remount.

## Verification Plan
1. **Test Consecutive Same-Song Playback**:
   - Queue the same song twice in a row.
   - Verify that clicking "Next" or letting the first instance finish cleanly starts the second instance from `0:00`, resets scores, and plays smoothly.
2. **Test Reload & Resume Lyrics Sync**:
   - Reload the browser while a song is playing.
   - Resume playback and verify that audio, vocals stem, and lyric highlight timings align precisely with zero latency drift.
3. **Test Participant State Isolation**:
   - Set active players in lobby.
   - Modify participants for an upcoming queue song.
   - Verify that lobby players in `useProfiles` / `melodiq_active_session` are NOT overwritten or corrupted.
4. **Compile & Lint**:
   - Run `npm run lint` and `npm run build` to verify zero errors or regressions.
