# Tasks: GuessArt Unified Header [ID: TASKS-GUESSART-HEADER]

- [x] 1. Enhance LayoutContext and GlobalHeader for rich titles and in-game back navigation <!-- id: 0 -->
    - [x] 1.1 Support `customHeaderTitle?: ReactNode` in `LayoutContext.tsx` <!-- id: 1 -->
    - [x] 1.2 Update `GlobalHeader.tsx` to render `customHeaderTitle` when available <!-- id: 2 -->
    - [x] 1.3 Update `GlobalHeader.tsx` to show `ArrowBack` icon when `homeAction` is provided <!-- id: 3 -->
- [x] 2. Implement GuessArt custom header integration (`useGuessArtHeader`) <!-- id: 4 -->
    - [x] 2.1 Create `src/games/guessart/hooks/useGuessArtHeader.tsx` <!-- id: 5 -->
    - [x] 2.2 Create compact drawing header widget with secret word badge, lock icon, and round badge <!-- id: 6 -->
    - [x] 2.3 Create guessing and waiting header widget with player and round info <!-- id: 7 -->
    - [x] 2.4 Bind menu actions (Share, Remote toggle, Edit game, History) into `LayoutContext` <!-- id: 8 -->
- [x] 3. Clean up GuessArt Game view and Canvas <!-- id: 9 -->
    - [x] 3.1 Integrate `useGuessArtHeader` in `src/games/guessart/GuessArtGame.tsx` and remove `<GameHeader />` <!-- id: 10 -->
    - [x] 3.2 Remove duplicate word banner from `src/games/guessart/components/DrawingCanvas.tsx` <!-- id: 11 -->
    - [x] 3.3 Ensure `GarticDrawingStep.tsx` and other consumers remain compatible <!-- id: 12 -->
- [x] 4. Verification and Polish <!-- id: 13 -->
    - [x] 4.1 Verify ESLint (`npm run lint`) <!-- id: 14 -->
    - [x] 4.2 Verify Build & TypeScript (`npm run build`) <!-- id: 15 -->
    - [x] 4.3 Verify i18n keys and unit/component behavior <!-- id: 16 -->
    - [x] 4.4 Create walkthrough log in `docs/verification/guessart-unified-header-walkthrough.md` <!-- id: 17 -->
