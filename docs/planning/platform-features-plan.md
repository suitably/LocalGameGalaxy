# Implementation Plan: PR 5 - Platform Features (WakeLock, Orientation, TTS, Latency, History, API) [ID: PLAN-PLATFORM-FEATURES]

## Goal Description
Implement platform-level enhancements and user convenience features:
1. **Issue #9 (`WakeLock / Screen Keep-Awake`)**: Prevent screen dimming and lock during gameplay in Melodiq, Werewolf, and Imposter using `useWakeLock`.
2. **Issue #12 (`Screen Orientation Lock`)**: Provide screen orientation management for landscape TV/gameplay and portrait phone remotes using `useScreenOrientation`.
3. **Issue #11 (`Latency Calibrator`)**: Provide an interactive audio/mic latency calibrator in Melodiq settings.
4. **Issue #10 (`Werewolf Narrator Audio/TTS`)**: Implement multi-lingual text-to-speech narration using `window.speechSynthesis` for Werewolf phase transitions.
5. **Issue #18 (`Client API Response Helper`)**: Ensure consistent JSON response envelopes across backend API routes.
6. **Issue #4 (`Phone Song History`)**: Record and display recently sung songs on mobile devices for easy re-queuing.

## Proposed Changes

### 1. `src/hooks/useWakeLock.ts` & `src/hooks/useScreenOrientation.ts`
- Create `useWakeLock(enabled: boolean)` hook with visibility re-acquisition.
- Create `useScreenOrientation(orientation?: 'portrait' | 'landscape')` hook.
- Connect to `MelodiqSession.tsx`, `MelodiqTV.tsx`, `WerewolfGame.tsx`, and `ImposterGame.tsx`.

### 2. `src/games/werewolf/hooks/useWerewolfNarrator.ts`
- Implement TTS synthesis hook that listens to phase changes and reads narrator lines aloud in DE/EN.
- Add toggle for narrator voice in Werewolf setup and settings.

### 3. `src/games/melodiq/components/LatencyCalibratorDialog.tsx`
- Implement interactive AudioContext calibrator measuring mic input response against rhythmic test beeps.

### 4. `src/games/melodiq/hooks/useSongHistory.ts`
- Persist recent sung song IDs and timestamps to `STORAGE_KEYS.SONG_HISTORY`.
- Add History view in Melodiq mobile catalog.

### 5. `server/src/utils/helpers.js`
- Standardize JSON API response payloads.

## Verification Plan
1. **WakeLock & Orientation**:
   - Verify screen stays awake during active playback and releases on exit.
2. **Werewolf TTS**:
   - Start Werewolf game and verify speech synthesis plays instructions for each active night role and morning announcement.
3. **Latency Calibrator**:
   - Run calibrator in Melodiq settings, verify beep sequence and latency estimation.
4. **Song History**:
   - Play a song on phone, verify it appears in recent history.
5. **Lint & Build**:
   - Run `npm run lint` and `npm run build`.
