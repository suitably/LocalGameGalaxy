---
title: "[Architecture][Cross-Game] Move DrawingCanvas to shared drawing module (Eliminate cross-game import)"
labels: ["architecture", "refactoring", "drawing", "garticphone", "guessart", "priority:high"]
assignees: []
---

## Summary
`src/games/garticphone/components/GarticDrawingStep.tsx` imports `DrawingCanvas` directly from `src/games/guessart/components/DrawingCanvas.tsx`.
According to `AGENTS.md` (Section 4.3 and Section 6), cross-game imports between `src/games/<A>` and `src/games/<B>` are **strictly forbidden**. This coupling causes games to break whenever another game's internal canvas component is modified.

## Problem Details & Exact Code Locations
1. **Forbidden import:**
   [`src/games/garticphone/components/GarticDrawingStep.tsx:6`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/games/garticphone/components/GarticDrawingStep.tsx#L6):
   ```typescript
   import { DrawingCanvas } from '../../guessart/components/DrawingCanvas';
   ```
2. **Current component location:**
   [`src/games/guessart/components/DrawingCanvas.tsx`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/games/guessart/components/DrawingCanvas.tsx) (191 lines).
   This component handles pointer drawing, Excalidraw integration, and stroke recording. It is not domain-specific to GuessArt.

## Dependencies & Preconditions
- **Dependencies:** None. This issue is self-contained and can be executed immediately in parallel.

## Step-by-Step Implementation Instructions
1. Move `src/games/guessart/components/DrawingCanvas.tsx` to `src/modules/drawing/DrawingCanvas.tsx`.
2. Inspect `DrawingCanvas.tsx` for any remaining relative imports and adjust them to the new location in `src/modules/drawing/`.
3. Export `DrawingCanvas` and related types in `src/modules/drawing/index.ts`.
4. Update imports in GuessArt:
   Find all references via:
   ```bash
   grep -rn "DrawingCanvas" src/games/guessart/
   ```
   Update their import path to:
   ```typescript
   import { DrawingCanvas } from '../../../modules/drawing/DrawingCanvas';
   // or from '../../../modules/drawing'
   ```
5. Update the import in GarticPhone:
   In `src/games/garticphone/components/GarticDrawingStep.tsx`:
   ```typescript
   // Replace:
   import { DrawingCanvas } from '../../guessart/components/DrawingCanvas';
   // With:
   import { DrawingCanvas } from '../../../modules/drawing/DrawingCanvas';
   ```

## Affected Files
- `src/games/guessart/components/DrawingCanvas.tsx` (moved to `src/modules/drawing/DrawingCanvas.tsx`)
- `src/modules/drawing/index.ts` (updated export)
- `src/games/guessart/GuessArtGame.tsx` (or other GuessArt components consuming it)
- `src/games/garticphone/components/GarticDrawingStep.tsx`

## Acceptance Criteria & Verification
- [ ] No file in `src/games/garticphone/` imports from `src/games/guessart/components/DrawingCanvas`.
- [ ] Verification command returns zero matches:
  ```bash
  grep -rn "from.*guessart/components/DrawingCanvas" src/
  ```
- [ ] `npm run lint` completes with zero errors.
- [ ] `npm run build` completes with zero errors.
- [ ] Drawing functionality in both GuessArt and GarticPhone remains fully operational.
