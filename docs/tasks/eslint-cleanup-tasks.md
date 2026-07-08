# ESLint Warning and State Effect Cleanup Tasks [ID: TASK-ESLINT-CLEANUP-001]

- [x] Configure ESLint to treat high-noise rules as warnings in `eslint.config.js` <!-- id: 1 -->
- [x] Add build outputs (`android`, `node_modules`) to `globalIgnores` in `eslint.config.js` <!-- id: 2 -->
- [x] Refactor `GameSetup.tsx` to compute imposter count during render instead of using a conditional `useEffect` hook <!-- id: 3 -->
- [x] Refactor `MelodiqGame.tsx` to sync `viewMode` default and reset `restoredSong` state during render <!-- id: 4 -->
- [x] Refactor `PhoneClientEngine.tsx` to use state lazy initializer instead of mount `useEffect` state update <!-- id: 5 -->
- [x] Refactor `HardwareMicSetup.tsx` to use lazy initializers and disable the false-positive warning for async mount invocation <!-- id: 6 -->
- [x] Fix React Hook rules violation in `PlaybackManager.tsx` (unconditional `useClientEngine` hook call) <!-- id: 7 -->
- [x] Fix unused ternary expression warning in `QRScannerDialog.tsx` by using an `if-else` block <!-- id: 8 -->
- [x] Derive `coverUrl` directly during render in `SongCard.tsx` and `SongListItem.tsx`, removing state/effects entirely <!-- id: 9 -->
- [x] Run `npm run lint` and verify success <!-- id: 10 -->
- [x] Run `npm run build` and verify successful production build <!-- id: 11 -->
