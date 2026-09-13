---
title: "[Refactor][DRY] Extract turn player calculation logic in GuessArt"
labels: ["refactoring", "dry", "guessart", "priority:medium"]
assignees: []
---

## Summary
Two different view components in GuessArt duplicate the exact same round drawer & guesser index computation formulas.
If the round progression algorithm changes or edge cases are fixed, multiple UI components have to be manually kept in sync.

## Problem Details & Exact Code Locations
Duplicate calculation:
```typescript
const effDIdx = dIdx >= 0 ? dIdx : (Math.max(1, round.roundNumber) - 1) % (game.players.length || 1);
```
1. [`src/games/guessart/components/WaitingForDrawerView.tsx:34-38`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/games/guessart/components/WaitingForDrawerView.tsx#L34)
2. [`src/games/guessart/components/WaitingForGuesserView.tsx:36-39`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/games/guessart/components/WaitingForGuesserView.tsx#L36)

## Dependencies & Preconditions
- **Dependencies:** None. Can be implemented independently.

## Step-by-Step Implementation Instructions
1. Inspect both `WaitingForDrawerView.tsx` and `WaitingForGuesserView.tsx` to collect all role-determination logic.
2. In `src/games/guessart/logic/turnUtils.ts` (or within `src/games/guessart/logic/engine.ts`), create helper functions:
   ```typescript
   import type { LocalGame, GameRound, Player } from './types';

   export function getEffectiveDrawerIndex(game: LocalGame, round: GameRound): number {
     const dIdx = round.drawerIndex ?? -1;
     return dIdx >= 0
       ? dIdx
       : (Math.max(1, round.roundNumber) - 1) % (game.players.length || 1);
   }

   export function getTurnPlayers(
     game: LocalGame,
     round: GameRound
   ): {
     drawer: Player | undefined;
     guesser: Player | undefined;
     drawerIndex: number;
   } {
     const drawerIndex = getEffectiveDrawerIndex(game, round);
     const drawer = game.players[drawerIndex];
     // Compute guesser according to game mode / round index
     const guesserIndex = (drawerIndex + 1) % (game.players.length || 1);
     const guesser = game.players[guesserIndex];

     return { drawer, guesser, drawerIndex };
   }
   ```
3. Update `WaitingForDrawerView.tsx` to call `getTurnPlayers(game, round)`.
4. Update `WaitingForGuesserView.tsx` to call `getTurnPlayers(game, round)`.
5. Add unit tests for `getEffectiveDrawerIndex` and `getTurnPlayers` in `src/games/guessart/logic/turnUtils.test.ts`.

## Affected Files
- `src/games/guessart/logic/turnUtils.ts` (new)
- `src/games/guessart/logic/turnUtils.test.ts` (new)
- `src/games/guessart/components/WaitingForDrawerView.tsx`
- `src/games/guessart/components/WaitingForGuesserView.tsx`

## Acceptance Criteria & Verification
- [ ] No duplicated modulo calculations in `WaitingForDrawerView.tsx` and `WaitingForGuesserView.tsx`.
- [ ] Turn calculation tests pass with coverage for single-player, multi-player, and round-overflow cases.
- [ ] `npm run lint` completes with zero errors.
- [ ] `npm run build` completes with zero errors.
