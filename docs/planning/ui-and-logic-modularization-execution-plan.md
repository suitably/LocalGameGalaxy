# Implementation Plan: UI & Logic Modularization and Issue Remediation [ID: PLAN-MODULARIZATION-EXECUTION]

## 1. Goal Description
Resolve the core architectural, navigation, and UI duplication issues identified in the comprehensive audit across LocalGameGalaxy:
1. **Fix Critical Architecture Coupling**: Decouple Storyteller from GuessArt Mailbox by extracting a generic MQTT Mailbox service into `src/modules/sync/MqttMailboxService.ts`.
2. **Fix Navigation Trapping & Double Headers**: Allow leaving Melodiq back to the Hub (`homeAction = null` when on 'Home'); remove duplicate back buttons and stacked headers in Sudoku and Wordle.
3. **Harmonize Player Management**: Migrate Imposter, Werewolf, and Cards to `<PlayerManagerCard />` and `useLobbyPlayers`. Fix the Werewolf translation leak in Imposter.
4. **Globalize Design Tokens & Theme**: Extend `src/theme.ts` with complete heading typography (`h4`-`h6`, `subtitle1`/`2`) and unified `MuiCard` styles (`borderRadius: 16`).
5. **Storage Hygiene**: Eliminate raw `localStorage` calls in Sudoku, Wordle, and Werewolf; remove dead `src/lib/db.ts`.
6. **Dialog Standardization**: Replace native HTML `<dialog>` in GuessArt (`RoundSuccessModal.tsx`, `GameInfoDialog.tsx`) with standard MUI `<Dialog>`.

## 2. Proposed Changes
- `src/modules/sync/MqttMailboxService.ts` (NEW): Generic typed MQTT service.
- `src/games/guessart/logic/mailboxService.ts`: Re-export or adapt to use shared service.
- `src/games/storyteller/StorytellerGame.tsx`: Use shared mailbox service directly with story payload types.
- `src/games/melodiq/hooks/useMelodiqHeader.tsx`: Restore home navigation when on 'Home'.
- `src/games/sudoku/SudokuGame.tsx`: Integrate with `usePageTitle`, remove redundant back button.
- `src/games/wordle/WordleGame.tsx`: Integrate with `usePageTitle`, remove redundant back button.
- `src/games/imposter/components/GameSetup.tsx` & `ImposterGame.tsx`: Adopt `PlayerManagerCard` & `useLobbyPlayers`.
- `src/games/cards/components/CardsLobby.tsx`: Adopt `PlayerManagerCard` & `useLobbyPlayers`.
- `src/games/werewolf/components/GameSetup.tsx`: Adopt `PlayerManagerCard`.
- `src/theme.ts`: Typography tokens and `MuiCard` defaults.
- `src/lib/storage.ts`: Register missing keys.
- `src/lib/db.ts`: DELETE dead file.
- `src/games/guessart/components/RoundSuccessModal.tsx` & `GameInfoDialog.tsx`: Migrate to MUI `<Dialog>`.
- `docs/tech/architecture.md`: Update with `src/modules/sync` and modularization changes.

## 3. Verification Plan
1. **Lint & Type Check**:
   - `npm run lint` must produce 0 errors.
   - `npm run build` (`tsc -b && vite build`) must succeed with exit code 0.
2. **Automated Unit Tests**:
   - `npm test` to ensure all 121+ unit tests pass without regression.
3. **Manual / Logic Verification**:
   - Verify Melodiq homeAction resets properly.
   - Verify Storyteller no longer imports GuessArt.
   - Verify Imposter uses correct i18n keys and `PlayerManagerCard`.
   - Verify Sudoku & Wordle single header presentation.
