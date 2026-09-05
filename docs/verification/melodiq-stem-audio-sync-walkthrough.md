# Verification Walkthrough: Melodiq Stem & Melody Audio Synchronization [ID: VERIFY-MELODIQ-AUDIO-SYNC]

## Changes Implemented

### 1. Completely Eliminated Laggy Audio Re-Mapping & Micro-Seeks (`useLocalMediaSync.ts`)
- **Root Cause**: The continuous sync loop previously recalculated raw `currentTime` drift on every animation frame (60-120fps). Due to browser audio clock quantization (which steps discretely every 20-50ms), the raw difference frequently oscillated across the threshold, triggering repeated `vocals.currentTime = masterTime` seeks and `playbackRate` tweaks. In HTML5 Audio, repeatedly seeking or altering `playbackRate` flushes decoding pipelines and invokes time-stretching DSP, creating severe audio stuttering, robotic flutter, and audible lag ("klingt laggy, weil audio immer wieder gemappt wird").
- **Fix**:
  - Removed all frame-by-frame micro-seeks and `playbackRate` modulations.
  - Audio and vocals stems are synchronized cleanly at start/seek/resume (`vocals.currentTime = masterTime`).
  - During normal playback, both stems play smoothly at 1.0x native audio rate without any DSP warping or buffer resets.
  - Added a 500ms safety threshold for genuine background tab sleep/freeze desync only.
  - Enabled `preservesPitch = true` on the vocals media element.

### 2. Fixed Play/Pause Cancel Loop (`useLocalMediaSync.ts` & `MelodiqSession.tsx`)
- Removed mutual `waiting` event listeners between `audio` and `vocals` that were firing during initial media frame decoding and recursively cancelling each other's playback.
- Fixed autostart error handling in `MelodiqSession.tsx` to prevent `hasStartedRef.current` from being reset on playback catch/pause, eliminating the infinite play/pause restart loop.

### 3. Synchronized Stem Seeks & Transport (`usePlaybackControls.ts`, `MelodiqSession.tsx`, `usePassiveSync.ts`, `useSessionPlayers.ts`)
- In `safePlay`, unconditionally aligned `vocalsRef.current.currentTime = currentPos` before calling `play()`, and executed both play promises concurrently via `Promise.all`.
- Keyboard arrow seeks (`ArrowRight`, `ArrowLeft`) now update `audioRef`, `vocalsRef`, and `videoRef` synchronously.
- `usePassiveSync` and `useSessionPlayers` now include `vocalsRef` so TV/remote sessions stay aligned across all audio stems.

### 4. Visual Melody Timeline Alignment (`PitchVisualizer.tsx`)
- Aligned `currentBeat` in `PitchVisualizer.tsx` with `(currentTime * 1000 - gap) / beatDuration`, matching `LyricsDisplay.tsx` and the song's audio playback.
- The visual notes ("Melodie") now reach the playhead in exact sync with the song audio and vocals ("Voice"), with microphone input latency handled cleanly inside `useScoringEngine`.

## Verification Results
- **Unit & Integration Tests**: `npm test` -> 19 test files passed (157 / 157 tests passed).
- **Linter**: `npm run lint` -> 0 errors.
- **TypeScript & Build**: `npm run build` -> Passed with 0 errors.
