# Implementation Plan: Melodiq Audio Stem & Melody Synchronization [ID: PLAN-MELODIQ-AUDIO-SYNC]

## Goal Description
Fix playback latency, stutter ("klingt laggy"), and desynchronization ("sometimes es ist wieder nicht aligned") between instrumental backing track ("Melodie") and vocal track ("Voice") in Melodiq:
1. **Audio Stem Sync Oscillation & Lag**: `useLocalMediaSync` used a bang-bang controller around a wide 30ms deadband, causing constant `playbackRate` flipping between 1.0 and 1.03. This produced audible time-stretch flutter ("klingt laggy") and allowed persistent 29ms desync. Snapping only occurred at >250ms, leaving long periods of audible misalignment.
2. **Missing Pre-roll & Initial Alignment**: Songs started playing before both `audioRef` and `vocalsRef` were verified ready (`readyState >= 2`), causing stems to start out of phase from frame 1.
3. **Missing Vocals Sync on Seek & Event Buffering**: Seeking (keyboard arrows, TV passive sync, remote sync) only sought `audioRef` and left `vocalsRef` desynchronized until the RAF loop noticed. Neither element listened to buffer stalls on the other.
4. **Visual Melody Delay in `PitchVisualizer`**: `PitchVisualizer` subtracted `latency` from `currentBeat`, causing the visual melody notes to arrive up to hundreds of milliseconds *after* the vocals sang them in the audio, desynchronizing from both audio and `LyricsDisplay`.

## Proposed Changes

### 1. `src/games/melodiq/gameplay/hooks/useLocalMediaSync.ts`
- Replace bang-bang controller with smooth proportional P-controller for micro-drift (12ms - 60ms).
- Lower hard-snap threshold from 250ms to 60ms so large drifts are corrected immediately rather than suffering seconds of laggy audio.
- Filter out jitter (< 12ms deadband within browser audio clock quantization) to avoid redundant `playbackRate` writes.
- Enforce `preservesPitch = true` on the vocals media element.
- When `vocals` finishes buffering or resumes, align `vocals.currentTime = masterTime` before calling `play()`.
- Add mutual buffer stall handling (`waiting` / `playing` event listeners) so buffering on one stem pauses the other.

### 2. `src/games/melodiq/gameplay/hooks/usePlaybackControls.ts`
- In `safePlay`, unconditionally synchronize `vocalsRef.current.currentTime = currentPos` before playing instead of allowing up to 50ms desync.
- Launch `play()` promises concurrently (`Promise.all`) for both stems.

### 3. `src/games/melodiq/gameplay/MelodiqSession.tsx`
- Ensure autostart checks that both `audioRef` and `vocalsRef` (if `vocalsSrc` exists) have reached `readyState >= 2` before calling `safePlay()`.
- Synchronize `vocalsRef.current.currentTime` on keyboard seek (`ArrowRight`, `ArrowLeft`) and passive state updates.

### 4. `src/games/melodiq/gameplay/hooks/usePassiveSync.ts`
- Pass `vocalsRef` and ensure passive TV synchronization updates `vocalsRef.current.currentTime` alongside `audioRef`.

### 5. `src/games/melodiq/gameplay/PitchVisualizer.tsx`
- Remove the improper `latency` offset from `currentBeat` note positioning so the visual melody notes arrive at the playhead in exact sync with the song audio and `LyricsDisplay`. Microphone latency is properly handled exclusively in `useScoringEngine`.

## Verification Plan
1. `npm test`: Verify existing unit and integration test suite passes.
2. `npm run lint` & `npm run build`: Verify zero lint errors and zero TypeScript compiler errors.
3. Test audio playback with separated stems: Verify that instrumental and vocals start in perfect phase, never flutter or oscillate `playbackRate`, and immediately recover if scrubbed or paused.
