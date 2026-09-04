---
title: "[Modularization] Extract Generic Async Game Repository & Conflict Engine Base"
labels: ["architecture", "modularization", "indexeddb", "dexie"]
assignees: []
---

## Summary
`guessart` and `storyteller` duplicate massive portions of their low-level IndexedDB access layer, repository CRUD logic, and snapshot conflict resolution algorithms.

## Problem Details
1. **Identical IDB Helper Code:**
   Lines 24–186 of [`storyteller/logic/db.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/games/storyteller/logic/db.ts#L24-L186) (162 lines) are a character-for-character duplicate of lines 29–191 of [`guessart/logic/db.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/games/guessart/logic/db.ts#L29-L191) (`openDatabase`, `withStore`, `getAll`, `putItem`, `deleteByKey`, error handling).
2. **Identical Repository Methods:**
   `guessart/logic/repository.ts` and `storyteller/logic/repository.ts` implement identical reverse-order queries (`getAll(store, 'byUpdatedAt', null, 'prev')`), cascaded record deletions, and optimistic timestamp updates.
3. **Identical Conflict Resolution & Snapshot Import:**
   `LocalGameEngine.importSnapshot` and `LocalStoryEngine.importSnapshot` follow identical state verification, freshness evaluation (`isSnapshotNewer` vs `isStorySnapshotNewer`), and local player mapping loops.
4. **Duplicate Player Locality Tracking:**
   `guessart/logic/playerAssignment.ts` and `storyteller/logic/playerAssignment.ts` are 100% identical files with only the storage key prefix differing (`guessart_local_players_` vs `storyteller_local_players_`).

## Proposed Solution (SOLID: Liskov Substitution & DRY)
1. **Extract `createIndexedDbStore` utility:**
   Centralize the promise-wrapped IndexedDB helper functions in `src/lib/db/indexedDbHelper.ts` or standardize on Dexie across all games.
2. **Modularize Player Assignment Service:**
   Extract `createPlayerAssignmentService(storagePrefix: string)` into `src/modules/player-management/`.
3. **Create `src/modules/async-game/`:**
   - Define `IAsyncGameEngine<TGame, TCreateOptions>` interface.
   - Base conflict resolution helper (`isSnapshotTimestampNewer`).
   - Extract a generic hook `useAsyncGameLobby<TGame, TCreateOpts>(engine, options)`.

## Affected Files
- `src/games/guessart/logic/db.ts` & `src/games/guessart/logic/repository.ts`
- `src/games/storyteller/logic/db.ts` & `src/games/storyteller/logic/repository.ts`
- `src/games/guessart/logic/playerAssignment.ts`
- `src/games/storyteller/logic/playerAssignment.ts`
- New: `src/modules/async-game/` & `src/modules/player-management/createPlayerAssignmentService.ts`

## Acceptance Criteria
- [ ] Banish 162 lines of duplicate IndexedDB boilerplate.
- [ ] Both games use the shared player locality service.
- [ ] Future asynchronous turn-based games can reuse the generic engine and lobby abstractions without rewriting storage plumbing.
