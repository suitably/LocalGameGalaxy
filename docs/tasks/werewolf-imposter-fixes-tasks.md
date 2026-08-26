# Tasks: PR 4 - Werewolf Custom Roles & Imposter DB Readiness [ID: TASKS-WEREWOLF-IMPOSTER]

## Checklist

- [x] **Phase 1: Werewolf Reducer & Custom Role State Extensibility (#19, #31)**
  - [x] Initialize custom role abilities dynamically in `START_GAME` in `src/games/werewolf/logic/gameReducer.ts`
  - [x] Add explicit handling for `CHECK_ROLE`, `COMPARE_CAMPS`, `PEEK`, and generic action types in `gameReducer.ts`
  - [x] Fix custom ability role ID fallback in `src/games/werewolf/components/NightPhase.tsx`

- [x] **Phase 2: Imposter DB Seeder Readiness & Error Recovery (#45)**
  - [x] Add error recovery and promise reset in `src/games/imposter/logic/dbSeeder.ts`

- [x] **Phase 3: Verification & Documentation**
  - [x] Run `npm run lint` and `npm run build`
  - [x] Create walkthrough in `docs/verification/werewolf-imposter-fixes-walkthrough.md`
