## Context & Problem

`jscpd` reports over 130 duplicated lines across `guessart` and `storyteller`:

1. `games/guessart/logic/db.ts` [27–68] <-> `games/storyteller/logic/db.ts` [22–63] (42 lines: identical IndexedDB session/export persistence routines).
2. `games/guessart/logic/engine.ts` [150–186] <-> `games/storyteller/logic/engine.ts` [33–69] (37 lines: identical round progression and turn sequencing).
3. `games/guessart/logic/playerAssignment.ts` [5–29] <-> `games/storyteller/logic/playerAssignment.ts` [3–27] (25 lines: identical circular turn assignment).
4. `games/guessart/components/SharePlayerLinksDialog.tsx` <-> `games/storyteller/components/ShareStoryLinksDialog.tsx` (identical URL generation / sharing logic).

Both games copied each other's core primitives instead of utilizing shared modules. Cross-game imports are forbidden (AGENTS.md Section 3), so common primitives must be placed in `src/modules/` or `src/lib/`.

## Branch

`refactor/dedup-guessart-storyteller`

## Target Files

- `src/games/guessart/logic/db.ts` & `src/games/storyteller/logic/db.ts`
- `src/games/guessart/logic/engine.ts` & `src/games/storyteller/logic/engine.ts`
- `src/games/guessart/logic/playerAssignment.ts` & `src/games/storyteller/logic/playerAssignment.ts`
- New shared utilities:
  - `src/lib/utils/turnAssignment.ts` (circular seat/turn assignment)
  - `src/lib/utils/turnAssignment.test.ts`
  - Leverage `src/modules/async-game` for IndexedDB operations
  - Leverage `src/modules/sharing` (`ShareSessionLinksDialog`) for session link dialogs

## Implementation Steps

1. **Extract Turn Assignment**:
   - Move pure round-robin/circular player assignment logic to `src/lib/utils/turnAssignment.ts` with comprehensive unit tests.
   - Refactor `guessart/logic/playerAssignment.ts` and `storyteller/logic/playerAssignment.ts` to delegate to this utility.
2. **Deduplicate IndexedDB Persistence**:
   - Extract common IndexedDB export/import boilerplate into helpers in `src/modules/async-game/idbUtils.ts`.
   - Refactor both games' `db.ts` to consume the helper.
3. **Sharing Dialogs**:
   - Replace custom duplicate sharing modals with `<ShareSessionLinksDialog>` from `src/modules/sharing`.

## Acceptance Criteria

- [ ] Over 100 duplicated lines eliminated across `guessart` and `storyteller`.
- [ ] No cross-game imports between `guessart` and `storyteller`.
- [ ] `npm run check:duplicates` shows 0 clones between these two games.
- [ ] All unit tests pass (`npm test`).

## Verification

```bash
npm run check:duplicates
npm run check:architecture:diff
npm test
npm run lint
```
