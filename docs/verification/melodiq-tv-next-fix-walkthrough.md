# Melodiq TV Mode — "Next" Button Fix Walkthrough

## Changes Implemented

### Root Cause

In `PlaybackManager.tsx`, `handleMiniPlayerNext()` was calling `sessionRef.current.handleNext()` regardless of whether TV mode was active. In TV mode:
- `suppressResults={isTVConnected}` → the scoreboard is never shown
- `handleNext()` calls `pauseForScore()`, pausing audio and setting `isPausedForScore = true`
- Because results are suppressed, nothing renders, and the song just **hangs** in a paused state
- The user had to click "Next" a second time to actually advance (since `isPausedForScore` was now `true`, `handleNext()` returned `false` on the 2nd call — but even then it didn't reliably advance)

### Fix

**File**: `src/games/melodiq/components/PlaybackManager.tsx`

Added an early-exit branch at the top of `handleMiniPlayerNext` for TV mode:

```typescript
if (isTVConnected) {
    // In TV mode, results are suppressed — skip the score pause entirely and
    // jump straight to the next queued song (or exit).
    const nextItem = popNext();
    if (nextItem) {
        onSelectSong(nextItem.song, true);
    } else {
        // No next song: finish the current session normally
        sessionRef.current?.finishSong();
    }
    return;
}
```

When the host clicks "Next" in TV mode:
- If there's a song in the queue → immediately start the next song
- If the queue is empty → call `finishSong()` to trigger the normal end-of-song flow

## Verification Results

- Logic reviewed manually; the fix correctly bypasses `pauseForScore` for TV sessions
- Non-TV mode path is unchanged (the `handleNext()` / score-pause flow still works as before)
- `finishSong()` is already exposed via `MelodiqSessionHandle` (`useImperativeHandle`)

## Outstanding Issues

- None known at this time.
