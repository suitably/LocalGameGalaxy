# Universal Galaxy Party Lobby Walkthrough

## Summary of Changes

### 1. Universal Party Lobby Architecture ("Jackbox Party Pack" Style)
Implemented a centralized, generalized multiplayer Party Lobby for *LocalGameGalaxy* that allows groups of players to connect once for the whole evening and lets the host switch and launch games without reconnecting:

1. **Universal Party Manager (`src/features/party/logic/universalPartyManager.ts`)**:
   - Manages party room lifecycle (`createParty`, `joinParty`, `launchGame`, `returnToLobby`, `subscribeToParty`).
   - Uses real-time Store-and-Forward / WebSockets on topic `party_{roomId}`.
   - **Host Protection & State Merging**: Fixed race condition where joining guests previously overwrote host status. Rooms now strictly identify and persist the Host device via `sessionStorage` (`party_host_id_${roomId}`).
   - Preserves player rosters, avatar colors, and scores across games.

2. **Universal Party Lobby Component (`src/features/party/PartyLobby.tsx`)**:
   - Displays room code, 1-click share link, and QR code for scanning with smartphones.
   - Shows live roster of joined players with avatars and Host badge.
   - Host Game Catalog under category **🎨 Zeichnen & Raten**:
     - **GuessArt**: Classic drawing & guessing with words, synonyms, and hint pool.
     - **Gartic Phone**: Pass-the-message drawing game with animated album reveal.
   - Guest waiting state: *"Der Host wählt gerade das nächste Spiel aus..."*.
   - In-Game Mode: Seamlessly renders the selected game with a top bar containing *"Zurück zur Party-Lobby"*.

3. **Decoupling Gartic Phone & GuessArt Modes**:
   - **GuessArt (`src/games/guessart/GuessArtGame.tsx`)**:
     - Removed redundant mini-lobby banner and embedded Gartic Phone wrapper.
     - GuessArt is now strictly focused on:
       1. **Pass & Play (Local)** on a single device.
       2. **Asynchronous Multiplayer** via turn snapshot links / MQTT store-and-forward mailbox.
   - **Gartic Phone (`src/games/guessart/garticphone/GarticPhoneGame.tsx` & `src/lib/gameRegistry.tsx`)**:
     - Registered as its own first-class game on the Hub (`/games/garticphone`).
     - Fully playable in the Party Lobby.

4. **Hub & Route Integration**:
   - Added `/party` route to `src/App.tsx`.
   - Added prominent **„🎉 Party-Modus (Mehrspieler-Lobby)“** hero banner to `src/features/hub/Hub.tsx`.

5. **Full Localization (i18n)**:
   - Added all `party.*` and `games.garticphone.*` keys to `public/locales/de/translation.json` and `public/locales/en/translation.json`.

---

## Verification Results
- **Vitest Unit Tests**: `17/17 tests passing` (`npm test`)
- **ESLint**: `0 errors` (`npm run lint`)
- **TypeScript & Vite Production Build**: Succeeded with exit code 0 (`npm run build`).
