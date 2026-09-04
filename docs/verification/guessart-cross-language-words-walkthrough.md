# GuessArt Cross-Language Words Walkthrough [ID: WALKTHROUGH-GUESSART-CROSS-LANG]

## Changes Implemented
- **Core Engine Payload Resolution (`src/games/guessart/logic/engine.ts`)**:
  - `toRoundPayload`: Now updates `word`, `wordMask`, `wordLength`, and `hintLetters` to reflect the requesting client's active language.
  - Automatically resolves translations from `DEFAULT_WORDS` if the round lacks complete translations (e.g. if the drawer submitted in English only, German translations and synonyms are dynamically enriched).
  - `selectWord`: Enriches the round's `translations` object with catalog data so evaluating guesses supports both languages seamlessly.
  - `listRounds`: Accepts an optional `language` parameter and maps round targets through `toRoundPayload`.
- **UI Components**:
  - `RoundSuccessModal.tsx`: Displays the localized word and, if different from the word as originally drawn, shows `(Gezeichnet als: [Originalwort])` / `(Drawn as: [Original Word])`.
  - `GuessArtGame.tsx`: Preserves the round's original word before localization and passes it to `RoundSuccessModal`.
  - `RoundHistoryDialog.tsx`: Passes active language to `listRounds` and displays the translated word alongside the original drawn term when they differ.
- **Localization (`public/locales/{de,en}/translation.json`)**:
  - Added `guessart.drawnAsOriginal` for German and English.
- **Tests**:
  - Added unit test suite in `src/games/guessart/logic/guessart.test.ts` verifying that English rounds resolve to German for German players, and that German rounds resolve to English for English players.

## Verification Results
- Vitest: 121 tests passing across 15 test suites (`npm run test`).
- Lint & Build: Executed via `npm run lint && npm run build`.
