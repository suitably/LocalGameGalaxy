# Task Tracking: UI & Logic Modularization Phase 2 [ID: TASKS-MODULARIZATION-PHASE2]

## Step 1: Drawing Module
- [x] Task 1.1: Create `src/modules/drawing/ExcalidrawViewer.tsx` and `src/modules/drawing/index.ts`
- [x] Task 1.2: Update GarticPhone (`GarticAlbumReveal.tsx`, `GarticGuessingStep.tsx`) to import from `src/modules/drawing`
- [x] Task 1.3: Update GuessArt (`GuessPanel.tsx`, `RoundHistoryDialog.tsx`, `WaitingForGuesserView.tsx`) to re-export or use `src/modules/drawing`

## Step 2: Sharing & Session Dialogs
- [x] Task 2.1: Create `src/modules/sharing/ShareSessionLinksDialog.tsx`
- [x] Task 2.2: Create `src/modules/sharing/EditSessionDialog.tsx` and `src/modules/sharing/index.ts`
- [x] Task 2.3: Wire GuessArt and Storyteller to use shared dialogs

## Step 3: Shared Dice Component
- [x] Task 3.1: Create `src/components/games/Die3D.tsx`
- [x] Task 3.2: Refactor `KnisterDiceRoller.tsx` and `QwixxDiceRoller.tsx` to use `Die3D`

## Step 4: Shared IndexedDB Helpers
- [x] Task 4.1: Create `src/modules/async-game/idbHelper.ts`
- [x] Task 4.2: Refactor `guessart/logic/db.ts` and `storyteller/logic/db.ts` to use shared helper

## Step 5: Confirm Dialog & Dialog Modernization
- [x] Task 5.1: Create `src/components/common/ConfirmDialog.tsx`
- [x] Task 5.2: Replace `window.confirm` in `MelodiqPlaylists.tsx` and `SongActionDialogs.tsx`

## Step 6: Verification & Documentation
- [x] Task 6.1: Run `npm test`
- [x] Task 6.2: Run `npx tsc -b`
- [x] Task 6.3: Run `npm run lint`
- [x] Task 6.4: Run `npm run build`
- [x] Task 6.5: Update `docs/tech/architecture.md`
- [x] Task 6.6: Create walkthrough log in `docs/verification/ui-and-logic-modularization-phase2-walkthrough.md`
