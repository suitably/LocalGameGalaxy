# Task Checklist: Melodiq Gameplay, Scoring & Media Sync Fixes [ID: TASKS-MELODIQ-GAMEPLAY-FIXES]

- [x] **Phase 1: Scoring Engine & Note Detection Fix**
  - [x] Apply UltraStar 4x BPM multiplier in `useScoringEngine.ts` to align `currentBeat` with `PitchVisualizer` and `LyricsDisplay`
  - [x] Add 10,000 max score normalization based on track note weights in `useScoringEngine.ts`
  - [x] Continuously update `player.score` on `PlayerRuntime` so final scoreboard reflects earned points
  - [x] Remove duplicate media sync logic from `useScoringEngine.ts`
- [x] **Phase 2: Local Media Sync & Stutter Elimination**
  - [x] Refactor `useLocalMediaSync.ts` to remove destructive `readyState < 3` pauses
  - [x] Ensure smooth drift compensation without audio stutter
- [x] **Phase 3: Visualizer Smoothness & Ball Cursor**
  - [x] Fix `PitchVisualizer.tsx` audio time interpolation (remove `readyState < 3` reset)
  - [x] Change sticky pitch timeout to 300ms with alpha fade-out
- [x] **Phase 4: Session Architecture & Ref Cleanup**
  - [x] Remove redundant initial `useSessionEnd` call from `MelodiqSession.tsx`
  - [x] Synchronize `playersRef` in `useSessionPlayers.ts`
- [x] **Phase 5: Verification & Documentation**
  - [x] Run `npm run lint` and `npm run build`
  - [x] Create `docs/verification/melodiq-gameplay-scoring-fixes-walkthrough.md`
  - [x] Update `docs/tech/melodiq-architecture.md`

