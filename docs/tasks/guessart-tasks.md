# GuessArt Integration Tasks [ID: GUESSART-TASKS]

- [x] 1. Core Logic & Types
  - [x] 1.1 Create `src/games/guessart/logic/types.ts` with all types (Game, Round, Category, Word, Guess, etc.)
  - [x] 1.2 Create `src/games/guessart/logic/db.ts` for IndexedDB storage (games, rounds, catalogues)
  - [x] 1.3 Create `src/games/guessart/logic/lingo.ts` for umlauts, normalization, and inflections
  - [x] 1.4 Create `src/games/guessart/logic/guessEvaluator.ts` and `src/games/guessart/logic/hintResolver.ts`
  - [x] 1.5 Create `src/games/guessart/logic/defaultLexicon.ts` with rich German & English word database
  - [x] 1.6 Create `src/games/guessart/logic/catalogueManager.ts` & `src/games/guessart/logic/repository.ts`
  - [x] 1.7 Create `src/games/guessart/logic/engine.ts` with full game loop transitions
  - [x] 1.8 Create `src/games/guessart/logic/excalidrawScene.ts` with draw ordering & animation planner

- [x] 2. Custom Hooks
  - [x] 2.1 Create `src/games/guessart/hooks/useGuessArtGame.ts`
  - [x] 2.2 Create `src/games/guessart/hooks/useGuessArtLobby.ts`
  - [x] 2.3 Create `src/games/guessart/hooks/useKeyboardInsets.ts`

- [x] 3. UI Components
  - [x] 3.1 Create `src/games/guessart/components/ExcalidrawLazy.tsx` & `src/games/guessart/components/DrawingCanvas.tsx`
  - [x] 3.2 Create `src/games/guessart/components/ExcalidrawViewer.tsx`
  - [x] 3.3 Create `src/games/guessart/components/WordSelector.tsx`
  - [x] 3.4 Create `src/games/guessart/components/HintWordSlots.tsx` & `src/games/guessart/components/HintLetterChips.tsx`
  - [x] 3.5 Create `src/games/guessart/components/GuessPanel.tsx`
  - [x] 3.6 Create `src/games/guessart/components/GameHeader.tsx` & `src/games/guessart/components/RoundSuccessModal.tsx`
  - [x] 3.7 Create `src/games/guessart/components/GameSetup.tsx` & `src/games/guessart/components/ActiveGamesList.tsx`
  - [x] 3.8 Create `src/games/guessart/components/GameInfoDialog.tsx`

- [x] 4. Game Entry & Hub Registration
  - [x] 4.1 Create `src/games/guessart/GuessArtGame.tsx` and `src/games/guessart/index.ts`
  - [x] 4.2 Register GuessArt in `src/lib/gameRegistry.tsx`
  - [x] 4.3 Add translation strings to `public/locales/de/translation.json` and `public/locales/en/translation.json`

- [x] 5. Cleanup, Verification & Documentation
  - [x] 5.1 Remove zip file `src/games/yidi-main.zip`
  - [x] 5.2 Run unit tests / vitest suite
  - [x] 5.3 Run `npm run lint` and `npm run build`
  - [x] 5.4 Update `docs/tech/architecture.md`
  - [x] 5.5 Write `docs/verification/guessart-walkthrough.md`
