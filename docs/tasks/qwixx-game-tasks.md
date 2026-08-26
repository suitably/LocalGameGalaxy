# Tasks: PR 7 - New Game Qwixx [ID: TASKS-QWIXX-GAME]

## Checklist

- [x] **Phase 1: Types & Reducer Logic**
  - [x] Implement `src/games/qwixx/logic/types.ts`
  - [x] Implement `src/games/qwixx/logic/qwixxReducer.ts` with scoring formulas and left-to-right rules

- [x] **Phase 2: UI Components**
  - [x] Implement `src/games/qwixx/components/QwixxRow.tsx`
  - [x] Implement `src/games/qwixx/components/QwixxDiceRoller.tsx`
  - [x] Implement `src/games/qwixx/components/QwixxScoreSummary.tsx`
  - [x] Implement `src/games/qwixx/components/QwixxOpponentView.tsx`
  - [x] Implement `src/games/qwixx/components/QwixxSheet.tsx`

- [x] **Phase 3: Main Game & P2P Integration**
  - [x] Implement `src/games/qwixx/QwixxGame.tsx`
  - [x] Implement `src/games/qwixx/index.ts` barrel file
  - [x] Add i18n in `src/games/qwixx/i18n/index.ts` (DE/EN)
  - [x] Register in `src/lib/gameRegistry.tsx`

- [x] **Phase 4: Verification & Documentation**
  - [x] Run `npm run lint` and `npm run build`
  - [x] Create walkthrough in `docs/verification/qwixx-game-walkthrough.md`
