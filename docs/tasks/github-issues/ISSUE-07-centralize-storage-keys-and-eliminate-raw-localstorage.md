---
title: "[Global][Storage] Eliminate Raw LocalStorage Bypasses & Centralize Key Registry in storage.ts"
labels: ["storage", "security", "resilience", "bug"]
assignees: []
---

## Summary
`src/lib/storage.ts` provides a resilient, in-memory-fallback-protected storage wrapper. However, several games (`sudoku`, `wordle`, `werewolf`, `melodiq`) bypass it completely and call raw `localStorage.getItem()` / `setItem()`. Additionally, key naming is fragmented across different conventions.

## Problem Details
1. **Raw `localStorage` Bypasses:**
   - Sudoku ([`useSudoku.ts:L31, L42`](file:///home/deck/Projects/LocalGameGalaxy/src/games/sudoku/hooks/useSudoku.ts#L31)): Uses raw `localStorage.getItem('galaxy_sudoku_state')`.
   - Wordle ([`wordleStorage.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/games/wordle/logic/wordleStorage.ts)): Local helper directly touches raw `localStorage`.
   - Werewolf ([`useGameStatePersistence.ts:L37`](file:///home/deck/Projects/LocalGameGalaxy/src/games/werewolf/hooks/useGameStatePersistence.ts#L37)): Calls raw `localStorage.getItem('werewolf-game-state')`.
   - Melodiq: More than 20 raw `localStorage.getItem()` calls scattered across components.
   - GuessArt ([`PublishCatalogueTab.tsx:L52`](file:///home/deck/Projects/LocalGameGalaxy/src/games/guessart/components/catalogue/PublishCatalogueTab.tsx#L52)): Directly reads `'melodiq_helper_url'` from localStorage instead of using the central accessor.
2. **Crash Risk in Restricted Browsers:**
   When cookies/local storage are blocked by browser privacy modes, raw `localStorage.setItem()` throws an unhandled DOMException, causing the game to crash. `storage.ts` protects against this via `memoryFallback`.
3. **Key Naming Convention Fragmentation:**
   - `galaxy_<game>_<key>`
   - `<game>_<key>`
   - `<game>-<key>`

## Proposed Solution (SOLID: Single Responsibility & Dependency Inversion)
1. Register all game keys in [`STORAGE_KEYS`](file:///home/deck/Projects/LocalGameGalaxy/src/lib/storage.ts#L6-L42).
2. Migrate all direct `localStorage` calls in Sudoku, Wordle, Werewolf, and Melodiq to `storage.getJson()` and `storage.setJson()`.
3. Replace cross-game key access in `PublishCatalogueTab.tsx` with `storage.getHelperUrl()` and `storage.getHelperToken()`.
4. Delete dead, orphaned Dexie database in `src/lib/db.ts`.

## Affected Files
- `src/lib/storage.ts`
- `src/games/sudoku/hooks/useSudoku.ts`
- `src/games/wordle/logic/wordleStorage.ts`
- `src/games/werewolf/hooks/useGameStatePersistence.ts`
- `src/games/guessart/components/catalogue/PublishCatalogueTab.tsx`
- `src/lib/db.ts` (deletion)

## Acceptance Criteria
- [ ] No direct `window.localStorage` calls outside of `src/lib/storage.ts`.
- [ ] All games continue to function without crashing when localStorage is restricted or in private browsing mode.
- [ ] Orphaned `src/lib/db.ts` deleted.
