# Implementation Plan: PR 4 - Werewolf Custom Roles & Imposter DB Readiness [ID: PLAN-WEREWOLF-IMPOSTER]

## Goal Description
Resolve critical architecture issues in Werewolf custom roles action handling and Imposter database initialization:
1. **Issue #19 & #31 (`[HIGH] Werewolf Custom Roles Action Mismatch and Broken State in gameReducer.ts`)**:
   - In `gameReducer.ts`, enhance `NIGHT_ACTION` to handle all role action types (including `CHECK_ROLE`, `COMPARE_CAMPS`, `PEEK`, `REVEAL_ROLE`, and custom ability types).
   - In `START_GAME`, dynamically initialize `powerState` for custom roles based on their defined abilities (potions, protections, infected status, custom uses).
   - In `NightPhase.tsx`, ensure target selection and ability resolution properly dispatch all multi-target and custom ability actions to the reducer without falling back to hardcoded werewolf role strings.
2. **Issue #45 (`[MEDIUM] Database Initialization Race Condition and Missing Readiness Guard in dbSeeder.ts`)**:
   - Add error handling and promise reset on failure in `dbSeeder.ts` to prevent stale/broken promise caching.
   - Guard category querying and word pair generation against empty or unseeded states.

## Proposed Changes

### 1. `src/games/werewolf/logic/gameReducer.ts`
- In `START_GAME`: Inspect `state.customRoles` and initialize per-ability `powerState` (e.g. `usesLeft`, `protectionsLeft`, `hasKillPotion`, `hasHealPotion`).
- In `NIGHT_ACTION`: Add explicit cases for `CHECK_ROLE`, `COMPARE_CAMPS`, `PEEK`, and generic ability types so no custom action is dropped or unrecognized.

### 2. `src/games/werewolf/components/NightPhase.tsx`
- Ensure custom ability dispatching uses the correct role definition ID rather than falling back to `'WEREWOLF'`.

### 3. `src/games/imposter/logic/dbSeeder.ts`
- Implement robust error catching, promise reset on failure, and safe category validation.

## Verification Plan
1. **Werewolf Custom Roles Verification**:
   - Create custom roles in RoleEditor with various abilities (`PROTECT`, `KILL`, `CHECK_ROLE`, `COMPARE_CAMPS`).
   - Start game and proceed through NightPhase.
   - Verify actions are logged in `nightDecisions` and resolved accurately in DayPhase without dropping actions or corrupting power states.
2. **Imposter DB Readiness Verification**:
   - Clear IndexedDB or perform initial launch.
   - Verify loading spinner shows during seed and categories load cleanly without race conditions.
3. **Lint & Build**:
   - Run `npm run lint` and `npm run build`.
