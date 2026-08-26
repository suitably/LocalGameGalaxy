# Tasks: PR 1 - Melodiq Playback & Session Stabilität [ID: TASKS-MELODIQ-PLAYBACK-SYNC]

## Checklist

- [x] **Phase 1: Storage & State Isolation (#20)**
  - [x] Add `STORAGE_KEYS.CURRENT_SONG_PARTICIPANTS` in `src/lib/storage.ts`
  - [x] Refactor `src/games/melodiq/hooks/useQueue.ts` to remove destructive writes to `melodiq_active_session`
  - [x] Update `src/games/melodiq/MelodiqGame.tsx` to store current song participant overrides under `STORAGE_KEYS.CURRENT_SONG_PARTICIPANTS`

- [x] **Phase 2: Same-Song Consecutive Playback Lifecycle (#87)**
  - [x] Update `src/games/melodiq/components/PlaybackManager.tsx` to generate unique `playbackId` on every song selection / transition (not just on reference comparison)
  - [x] Ensure `melodiq_saved_time` is properly invalidated / cleared on song end and skip transitions
  - [x] Pass unique session key to `MelodiqSession`

- [x] **Phase 3: Play/Pause/Reload Audio & Lyrics Sync (#88)**
  - [x] In `src/games/melodiq/gameplay/MelodiqSession.tsx`, ensure `initialTime` is applied only after audio metadata is ready
  - [x] In `src/games/melodiq/gameplay/hooks/usePlaybackControls.ts`, keep `vocalsRef` synchronized with `audioRef.currentTime` on every play/resume call

- [x] **Phase 4: Verification & Documentation**
  - [x] Run `npm run lint` and fix any warnings or errors
  - [x] Run `npm run build` to verify clean build
  - [x] Create walkthrough in `docs/verification/melodiq-playback-sync-fixes-walkthrough.md`
