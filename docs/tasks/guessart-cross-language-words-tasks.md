# GuessArt Cross-Language Words Tasks [ID: TASKS-GUESSART-CROSS-LANG]

- [x] 1. Core Logic & Engine
  - [x] 1.1 Update `toRoundPayload` in `src/games/guessart/logic/engine.ts` to localize `word` and fallback to catalogue
  - [x] 1.2 Update `selectWord` in `src/games/guessart/logic/engine.ts` to enrich translations from master catalogue / DEFAULT_WORDS
  - [x] 1.3 Update `listRounds` in `src/games/guessart/logic/engine.ts` to accept `language` and map via `toRoundPayload`
- [x] 2. UI Components
  - [x] 2.1 Update `RoundSuccessModal.tsx` to support and render `originalWord`
  - [x] 2.2 Update `GuessArtGame.tsx` to pass localized word and `originalWord` to `RoundSuccessModal`
  - [x] 2.3 Update `RoundHistoryDialog.tsx` to pass `language` and display localized word with original reference
- [x] 3. Localization
  - [x] 3.1 Add `guessart.drawnAsOriginal` to `public/locales/de/translation.json`
  - [x] 3.2 Add `guessart.drawnAsOriginal` to `public/locales/en/translation.json`
- [x] 4. Verification & Testing
  - [x] 4.1 Add unit tests in `src/games/guessart/logic/guessart.test.ts`
  - [x] 4.2 Run `npm run test`
  - [x] 4.3 Run `npm run lint` and `npm run build`
