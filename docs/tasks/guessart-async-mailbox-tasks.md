# GuessArt Store-and-Forward Async Mailbox Tasks

- [ ] **Phase 1: Engine Import Support**
  - [ ] Implement `LocalGameEngine.importSnapshot(snapshot)` in `src/games/guessart/logic/engine.ts` to save remote turns into local IndexedDB.
- [ ] **Phase 2: Mailbox Service**
  - [ ] Create `src/games/guessart/logic/mailboxService.ts` using `mqtt` (WSS connection, retain=true on publish, auto-cleanup on receive).
- [ ] **Phase 3: Hook & UI Integration**
  - [ ] Update `src/games/guessart/hooks/useGuessArtGame.ts` to publish turns to the mailbox and subscribe to incoming turns.
  - [ ] Update `src/games/guessart/GuessArtGame.tsx` to handle URL data unpacking and share links with compressed state fallback.
- [ ] **Phase 4: Verification & Walkthrough**
  - [ ] Run `npm test` (`vitest run`).
  - [ ] Run `npm run lint`.
  - [ ] Run `npm run build` (`tsc -b && vite build`).
  - [ ] Create `docs/verification/guessart-async-mailbox-walkthrough.md`.
