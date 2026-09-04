# Task Tracking: UI & Logic Modularization Execution [ID: TASKS-MODULARIZATION-EXECUTION]

## Phase 1: Critical Architecture & Navigation Fixes
- [x] Task 1.1: Extract generic MQTT mailbox into `src/modules/sync/MqttMailboxService.ts`
- [x] Task 1.2: Decouple Storyteller from GuessArt mailbox in `StorytellerGame.tsx`
- [x] Task 1.3: Fix Melodiq navigation trapping in `useMelodiqHeader.tsx`
- [x] Task 1.4: Eliminate double headers & duplicate back buttons in `SudokuGame.tsx` and `WordleGame.tsx`

## Phase 2: Player Management Consolidation
- [x] Task 2.1: Migrate `imposter` to `<PlayerManagerCard />` and `useLobbyPlayers`, fix Werewolf i18n keys
- [x] Task 2.2: Migrate `cards` to `<PlayerManagerCard />` and `useLobbyPlayers` with persistence
- [x] Task 2.3: Migrate `werewolf` setup to `<PlayerManagerCard />`

## Phase 3: Global Theme, Storage Hygiene & Dialog Standardization
- [x] Task 3.1: Expand `src/theme.ts` with typography and card defaults
- [x] Task 3.2: Eliminate raw `localStorage` in Sudoku, Wordle, and Werewolf; remove dead `src/lib/db.ts`
- [x] Task 3.3: Migrate GuessArt `RoundSuccessModal.tsx` and `GameInfoDialog.tsx` from HTML `<dialog>` to MUI `<Dialog>`

## Phase 4: Verification & Documentation
- [x] Task 4.1: Run `npm test` and verify all tests pass
- [x] Task 4.2: Run `npm run lint` (0 errors)
- [x] Task 4.3: Run `npm run build` (exit 0)
- [x] Task 4.4: Update `docs/tech/architecture.md`
- [x] Task 4.5: Create walkthrough log in `docs/verification/ui-and-logic-modularization-execution-walkthrough.md`
