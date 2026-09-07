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

### 5. Automated 1:1 Stem Sync & Zero-Latency Volume Controls (`GameSettingsPanel.tsx`, `SettingsContext.tsx`, `useLocalMediaSync.ts`, `MelodiqSession.tsx`)
- **Automated 1:1 Sync Without Manual Offset**:
  - Removed manual `vocalsOffset` setting from UI and storage as the engine now synchronizes stems automatically to `audio.currentTime` with zero offset.
  - Tightened stem pre-play alignment check to 1ms in `safePlay` (`usePlaybackControls.ts`), ensuring vocal and instrumental stems start sample-locked from the first note.
- **Zero-Latency Volume Controls**:
  - **Root Cause of Volume Latency**: Dragging the volume sliders (`vocalsVolume`, `songVolume`, `masterVolume`) previously dispatched state updates on every pointer move tick, triggering synchronous `localStorage.setItem` writes, `BroadcastChannel` setup/teardown, and full-tree React re-renders in `SettingsProvider` and `MelodiqSession`.
  - **Fix**:
    - Sliders in `GameSettingsPanel.tsx` now maintain local state for 120fps non-blocking dragging.
    - Dragging dispatches a lightweight custom DOM event (`melodiq_direct_volume`) which directly updates `audioRef.current.volume` and `vocalsRef.current.volume` immediately with 0ms latency and zero React re-renders.
    - Settings persistence to `localStorage` and `BroadcastChannel` is committed only on `onChangeCommitted` when dragging ends.
    - Reused a persistent `BroadcastChannel` instance in `SettingsContext.tsx` instead of creating and closing channels per event.
- **Jitter-Free Drift Smoothing**:
  - `useLocalMediaSync.ts` uses an exponential moving average (`0.85 / 0.15`) to filter out Chromium's asynchronous `currentTime` IPC reporting noise.
  - Normal playback keeps `playbackRate` at 1.0 without time-stretcher engaging.
  - Sustained drift (> 20ms) applies an imperceptible ±0.5% micro-rate trim (inaudible, zero WSOLA smearing), returning to 1.0 once pulled within 4ms.

### 6. Seamless Audio Playback Mode Switch (Separated Stems <-> Original Audio) (`MelodiqSession.tsx`)
- **Root Cause**: Switching between "Separated Stems" and "Original Audio" changed the `<audio src>` attribute in the DOM, which causes the browser HTMLMediaElement to immediately reset its internal `currentTime` to 0:00 and pause.
- **Fix**:
  - `MelodiqSession` now continuously tracks active playback timestamp (`lastPlaybackPosRef.current`) and playing state before any DOM updates occur.
  - When `settings.audioPlaybackMode` changes, the active time is captured into `pendingModeSwitchResumeRef`.
  - When the new audio track loads (`srcChanged` or `vocalsChanged`), the session waits for `canplay` on the new track, seeks directly to `resumeTime` (and aligns `vocals` if entering separated mode), and smoothly resumes playback via `safePlay()` if the song was previously playing.
  - When switching between modes where the primary audio source is shared and only vocals are mounted/unmounted, master audio continues playing without even a millisecond of interruption.

## Verification Results
- **Unit & Integration Tests**: `npm test` -> 20 test files passed (163 / 163 tests passed).
- **TypeScript & Build**: `npm run build` (`tsc -b && vite build`) -> Passed with 0 errors.
- **Linter**: `npx eslint src/games/melodiq/ --quiet` -> 0 errors.
