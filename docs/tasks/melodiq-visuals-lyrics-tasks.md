# Tasks: PR 3 - Melodiq Visuals, Lyrics Stability & TV Sung Trails [ID: TASKS-MELODIQ-VISUALS]

## Checklist

- [x] **Phase 1: Lyrics Layout Stability & Jump Prevention (#89)**
  - [x] Stabilize line container heights and line heights in `src/games/melodiq/gameplay/LyricsDisplay.tsx`
  - [x] Replace `transform: scale` on active syllables with layout-safe glowing text-shadow highlights

- [x] **Phase 2: Full-screen Centered Sing-Along for No-Mic Mode (#92)**
  - [x] Optimize zero-player layout in `src/games/melodiq/gameplay/MelodiqSession.tsx` for centered party sing-along

- [x] **Phase 3: Sung Segments Synchronization on TV (#17)**
  - [x] Include `sungSegments` in `useScoringEngine.ts` and `MelodiqSession.tsx` game state broadcast
  - [x] Assign `pState.sungSegments` to `rt.segmentsRef.current` in `usePassiveSync.ts`

- [x] **Phase 4: Verification & Documentation**
  - [x] Run `npm run lint` and `npm run build`
  - [x] Create walkthrough in `docs/verification/melodiq-visuals-lyrics-walkthrough.md`
