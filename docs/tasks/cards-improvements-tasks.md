# Tasks: Card Games UX Modernization & Streamlining

- [/] 1. Lobby Clean-up <!-- id: task-lobby -->
  - [x] Remove custom game creation card and builder dialog from `CardsLobby.tsx`
  - [x] Ensure only built-in game modes are displayed cleanly
- [ ] 2. Schwimmen Direct Life & Blitz Engine <!-- id: task-schwimmen-engine -->
  - [ ] Refactor `schwimmenEngine.ts` to support direct loser assignment & Blitz instant round resolutions
  - [ ] Update unit tests in `cardsEngine.test.ts`
- [ ] 3. Schwimmen UI Redesign <!-- id: task-schwimmen-ui -->
  - [ ] Remove point input fields (0-31)
  - [ ] Implement direct loser selection ("💔 Verliert 1 Leben"), instant "⚡ Blitz!" button per player, and round evaluation
  - [ ] Add undo / life adjustment and round history dialog
- [ ] 4. Universal Score Tracker (+/- Points) Modernization <!-- id: task-score-tracker -->
  - [ ] Create `ModernScoreAdjuster.tsx` with quick delta chips (+1, +5, +10, +50, -1, -5, -10, -50), tactile stepper, live target score preview, and clear button
  - [ ] Integrate into `UniversalScoreView.tsx` with ranking medals and round history
- [ ] 5. Localization & Verification <!-- id: task-i18n-verify -->
  - [ ] Update German & English translations in `src/games/cards/i18n/index.ts`
  - [ ] Run test suite (`npm run test`)
  - [ ] Run build (`npm run build`)
  - [ ] Create walkthrough documentation in `docs/verification/cards-improvements-walkthrough.md`
