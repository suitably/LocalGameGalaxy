# Knister Custom / Physical Dice & Manual Input — Tasks [ID: TASKS-KNISTER-DICE]

- [x] **Phase 1: Types & Reducer Upgrades** <!-- id: 0 -->
  - [x] Update `src/games/knister/logic/types.ts` to support optional `value` in `PLACE_NUMBER`, `UNDO_MOVE` action, and move history stack in `KnisterState` <!-- id: 1 -->
  - [x] Refactor `src/games/knister/logic/knisterReducer.ts` to process manual placements and undo operations <!-- id: 2 -->
  - [x] Add comprehensive unit tests in `src/games/knister/logic/knisterReducer.test.ts` for manual placement and undo <!-- id: 3 -->

- [x] **Phase 2: UI Components Implementation** <!-- id: 4 -->
  - [x] Create `src/games/knister/components/KnisterNumberBar.tsx` (numbers 2 to 12 quick select bar with active selection state and clear action) <!-- id: 5 -->
  - [x] Create `src/games/knister/components/KnisterNumberPickerModal.tsx` (numpad/grid picker for direct cell clicks) <!-- id: 6 -->
  - [x] Update `src/games/knister/components/KnisterBoard.tsx` to handle selected number preview, direct empty cell clicking, and picker triggering <!-- id: 7 -->
  - [x] Update `src/games/knister/components/KnisterDiceRoller.tsx` (collapsible/streamlined layout integration) <!-- id: 8 -->

- [x] **Phase 3: Main Screen & Integration** <!-- id: 9 -->
  - [x] Update `src/games/knister/KnisterGame.tsx` with header "Würfel" toggle button (stored in `localStorage`), Undo button, collapsible dice section, and modal coordination <!-- id: 10 -->
  - [x] Update `src/games/knister/i18n/index.ts` with complete German and English translations for all new features <!-- id: 11 -->

- [x] **Phase 4: Verification & Documentation** <!-- id: 12 -->
  - [x] Run `npm run test` (all unit tests pass) <!-- id: 13 -->
  - [x] Run `npm run lint` and `npm run build` (zero errors/warnings) <!-- id: 14 -->
  - [x] Create verification walkthrough in `docs/verification/knister-custom-dice-walkthrough.md` <!-- id: 15 -->
  - [x] Update `docs/tech/architecture.md` if necessary <!-- id: 16 -->
