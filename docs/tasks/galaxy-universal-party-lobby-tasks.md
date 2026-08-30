# Universal Galaxy Party Lobby Tasks

- [ ] **Phase 1: Universal Party Manager Logic**
  - [ ] Create `src/features/party/logic/universalPartyManager.ts` with room state, player management, and game launching.
- [ ] **Phase 2: Party Lobby UI & Game Selection**
  - [ ] Create `src/features/party/PartyLobby.tsx` with room QR code, live player roster, and category "Zeichnen & Raten" (GuessArt, Gartic Phone).
  - [ ] Integrate `/party` route into `src/App.tsx` and Hero Banner in `src/features/hub/Hub.tsx`.
- [ ] **Phase 3: Game Transitions & Returns**
  - [ ] Connect GuessArt and Gartic Phone to launch with Party Player roster and allow returning to Party Lobby.
  - [ ] Add i18n keys to `de/translation.json` and `en/translation.json`.
- [ ] **Phase 4: Verification & Walkthrough**
  - [ ] Run `npm test` (`vitest run`).
  - [ ] Run `npm run lint`.
  - [ ] Run `npm run build` (`tsc -b && vite build`).
  - [ ] Write `docs/verification/galaxy-universal-party-lobby-walkthrough.md`.
