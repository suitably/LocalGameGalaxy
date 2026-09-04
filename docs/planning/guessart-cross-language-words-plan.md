# GuessArt Cross-Language Words Plan [ID: PLAN-GUESSART-CROSS-LANG]

## Goal Description
In GuessArt, when Player A draws in English (e.g. word "Dog") and Player B plays the game in German, Player B currently sees the English word "Dog" instead of the German translation "Hund" on round completion, in the success modal, in round history, and in hints.

The goal is to provide seamless cross-language gameplay:
1. When Player A draws in English, the round stores full multilingual translations (`en`, `de`).
2. When Player B views the game in German:
   - The round target word is localized to German ("Hund").
   - Hints (word length, letter slots, letter chips) correspond to the German word.
   - When Player B guesses correctly, the victory modal displays the German word ("Hund") with an optional indicator showing the original drawing term ("Gezeichnet als: Dog").
   - Round history displays the localized German word with the original drawing term.
   - Guesses in either language (German or English) or their synonyms remain valid and recognized.

## Component & File Architecture (SRP)
- **`src/games/guessart/logic/engine.ts`**:
  - `toRoundPayload`: Localize `round.word` to the requested player language via `resolveWordForLanguage`, with catalogue fallback if translations are sparse.
  - `selectWord`: Enrich translations from `DEFAULT_WORDS` / `masterCatalogue` (e.g. for manual words or incomplete payloads).
  - `listRounds`: Support `language` parameter and map rounds through `toRoundPayload`.
- **`src/games/guessart/components/RoundSuccessModal.tsx`**:
  - Accept `originalWord` and display `(Gezeichnet als: ...)` when the localized word differs from the drawer's original word.
- **`src/games/guessart/GuessArtGame.tsx`**:
  - Pass localized word and `originalWord` to `RoundSuccessModal`.
- **`src/games/guessart/components/RoundHistoryDialog.tsx`**:
  - Pass current UI `language` to `listRounds`.
  - Render localized word and display original drawing term when different.
- **`public/locales/de/translation.json` & `public/locales/en/translation.json`**:
  - Add i18n translation keys for `drawnAsOriginal`.
- **`src/games/guessart/logic/guessart.test.ts`**:
  - Comprehensive unit tests covering cross-language round resolution and enrichment.

## Verification Plan
1. **Automated Tests**:
   - Run `npm run test` (vitest) to verify all existing and new unit tests.
   - Run `npm run lint` to verify ESLint cleanliness.
   - Run `npm run build` (`tsc -b && vite build`) to ensure type safety and bundling.
2. **Logic Validation**:
   - Unit test scenario: Round created with word "Dog" (en) containing German translation "Hund".
   - Validate that `toRoundPayload` with `language = 'de'` returns `word: 'Hund'`, `wordLength: 4`, and German mask.
   - Validate that `toRoundPayload` with `language = 'en'` returns `word: 'Dog'`, `wordLength: 3`, and English mask.
   - Validate that guesses "Hund" and "Dog" are both accepted.
