# Implementation Plan: UI & Logic Modularization Phase 2 [ID: PLAN-MODULARIZATION-PHASE2]

## 1. Goal Description
Implement the remaining modularization, deduplication, and code hygiene tasks identified in the SOLID architectural analysis:
1. **Drawing Module (`src/modules/drawing/`)**: Extract `ExcalidrawViewer` from GuessArt into a shared module so GarticPhone no longer depends directly on GuessArt.
2. **Sharing & Edit Dialogs Module (`src/modules/sharing/`)**: Unify `SharePlayerLinksDialog` and `ShareStoryLinksDialog` into `ShareSessionLinksDialog`, and unify `EditGameDialog` and `EditStoryDialog` into `EditSessionDialog`.
3. **Unified Dice Roller (`src/components/games/Die3D.tsx` / `DiceRoller.tsx`)**: Deduplicate 3D CSS dice styling and roll animations across Knister and Qwixx.
4. **Shared Async-Game IndexedDB Helpers (`src/modules/async-game/idbHelper.ts`)**: Extract low-level IndexedDB transaction boilerplate (`withStore`, `requestToPromise`, `cursorCollect`) shared by GuessArt and Storyteller.
5. **ConfirmDialog & Modal A11y**: Replace remaining native `window.confirm()` calls in Melodiq and GuessArt Catalogue Editor with accessible MUI `ConfirmDialog`.
6. **Storage Hygiene**: Centralize Melodiq and GuessArt storage keys into `src/lib/storage.ts`.

## 2. Proposed Changes
- `src/modules/drawing/`:
  - `ExcalidrawViewer.tsx`
  - `index.ts`
- `src/games/garticphone/components/`:
  - Update `GarticAlbumReveal.tsx` and `GarticGuessingStep.tsx` imports.
- `src/modules/sharing/`:
  - `ShareSessionLinksDialog.tsx`
  - `EditSessionDialog.tsx`
  - `index.ts`
- `src/games/guessart/components/` & `src/games/storyteller/components/`:
  - Refactor to consume shared dialogs or wrap them.
- `src/components/games/`:
  - `Die3D.tsx` (reusable 3D animated die component)
- `src/games/knister/components/KnisterDiceRoller.tsx` & `src/games/qwixx/components/QwixxDiceRoller.tsx`:
  - Adopt shared `Die3D`.
- `src/modules/async-game/idbHelper.ts`:
  - Shared IDB transaction runner and cursor collector.
- `src/games/guessart/logic/db.ts` & `src/games/storyteller/logic/db.ts`:
  - Use `idbHelper.ts`.
- `src/components/common/ConfirmDialog.tsx`:
  - New accessible MUI confirmation dialog component.

## 3. Verification Plan
- Unit tests: `npm test` (all suites must pass).
- TypeScript static check: `npx tsc -b` (0 errors).
- Linter: `npm run lint` (0 errors).
- Build: `npm run build` (successful compilation and asset bundling).
