# Tasks: PR 5 - Platform Features (WakeLock, Orientation, TTS, Latency, History, API) [ID: TASKS-PLATFORM-FEATURES]

## Checklist

- [x] **Phase 1: WakeLock & Screen Orientation Hooks (#9, #12)**
  - [x] Implement `src/hooks/useWakeLock.ts`
  - [x] Implement `src/hooks/useScreenOrientation.ts`
  - [x] Integrate into `MelodiqSession.tsx`, `MelodiqTV.tsx`, `WerewolfGame.tsx`, and `ImposterGame.tsx`

- [x] **Phase 2: Werewolf Narrator Audio/TTS (#10)**
  - [x] Enhance `src/games/werewolf/hooks/useTTS.ts` with persisted enable state and voices
  - [x] Integrate TTS narration into `NightPhase.tsx` and `DayPhase.tsx` with volume toggle button

- [x] **Phase 3: Automated Audio Latency Calibrator (#11)**
  - [x] Create `src/games/melodiq/components/LatencyCalibratorDialog.tsx`
  - [x] Add Calibrate Latency button and slider to `GameSettingsPanel.tsx` and `useScoringEngine.ts`

- [x] **Phase 4: Phone Song History & API Response Standardization (#4, #18)**
  - [x] Create `src/games/melodiq/hooks/useSongHistory.ts`
  - [x] Track recent songs in `useQueue.ts`
  - [x] Standardize API responses in `server/src/utils/helpers.js`

- [x] **Phase 5: Verification & Documentation**
  - [x] Run `npm run lint` and `npm run build`
  - [x] Create walkthrough in `docs/verification/platform-features-walkthrough.md`
