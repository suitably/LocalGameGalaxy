# Universal Galaxy Party Lobby Implementation Plan

## Goal Description
Build a centralized, generalized multiplayer Party Lobby ("Jackbox Party Pack" style) where players connect once for the whole game night and the Host can select and launch games on-the-fly:
1. **Single Universal Room**: Players scan 1 QR code / open 1 link to join the Party Lobby (`#/party?room=XYZ`).
2. **Category & Game Selection for Host**:
   - Category **🎨 Zeichnen & Raten**:
     - **GuessArt**: Classic drawing & guessing with catalogue words or custom words + hints.
     - **Gartic Phone**: Pass-the-message drawing game (Sentence ➔ Draw ➔ Guess ➔ Draw ➔ Album).
3. **Seamless Transition & Return**:
   - Launching a game automatically switches all connected phones into the game session.
   - At the end of a round or game, players can return to the shared Party Lobby without reconnecting or sharing new links.

---

## Proposed File Changes

### 1. Universal Party Logic (`src/features/party/logic/universalPartyManager.ts`)
- Manages party room state:
  - `roomId`, `hostId`, `status: 'lobby' | 'in_game'`, `selectedGame: 'guessart' | 'garticphone' | null`
  - `players: PartyPlayer[]` (id, name, avatarColor, isHost)
- Methods: `createPartyRoom`, `joinPartyRoom`, `selectAndStartGame`, `returnToLobby`, `subscribeToParty`.

### 2. Universal Party Lobby Component (`src/features/party/PartyLobby.tsx`)
- Header with Room Code, Copy Link, and QR-Code toggle.
- Live Player Roster (Avatars, Names, Ready badges, Host badge).
- Game Selection Catalog (Host only):
  - Category "🎨 Zeichnen & Raten" with GuessArt and Gartic Phone cards.
- Player waiting indicator ("Host wählt gerade das nächste Spiel...").

### 3. Route & Hub Integration
- Add route `/party` in `src/App.tsx`.
- Add Party Mode Hero Banner in `src/features/hub/Hub.tsx` ("🎉 Party-Raum erstellen / beitreten").
- Provide "Zurück zur Party-Lobby" exit action in GuessArt and Gartic Phone.

### 4. Localization (i18n)
- Add translation keys for party lobby, categories, and game selector in `de/translation.json` and `en/translation.json`.

---

## Verification Plan
1. `npm test` (`vitest run`).
2. `npm run lint` (0 errors).
3. `npm run build` (`tsc -b && vite build`).
4. `docs/verification/galaxy-universal-party-lobby-walkthrough.md`.
