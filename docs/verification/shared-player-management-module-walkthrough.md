# Walkthrough: Shared Player Management Module [ID: WALKTHROUGH-PLAYER-MANAGEMENT]

## Overview
We extracted the player management functionality originally designed in **GuessArt** into a shared, reusable module in `src/modules/player-management`. Both **GuessArt** and **Geschichtenschreiber** (Storyteller) now consume this module.

This addresses the issue where users in **Geschichtenschreiber** could not delete "Spieler 1" and "Spieler 2" (due to a previous artificial constraint `players.length > 2`). Users can now delete any player down to 0 and enter custom player names. Starting the game remains safely guarded against having fewer than `minPlayers` (default 2).

---

## Implemented Components & Files

### 1. `src/modules/player-management/`
- [`types.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/modules/player-management/types.ts):
  - `LobbyPlayerItem`, `UseLobbyPlayersOptions`, `UseLobbyPlayersResult`, `PlayerManagerCardProps`.
- [`playerLogic.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/modules/player-management/playerLogic.ts):
  - Pure, framework-agnostic helper functions (`addPlayerToLobby`, `removePlayerFromLobby`, `togglePlayerRemoteInLobby`, `normalizePlayerItem`).
  - Enforces duplicate prevention (case-insensitive), whitespace trimming, and optional `maxPlayers`.
  - Removes players unconditionally (by name or index), allowing all default players to be removed.
- [`useLobbyPlayers.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/modules/player-management/useLobbyPlayers.ts):
  - Reusable React hook managing player state, localStorage persistence with backwards-compatible migration, and min/max player validation.
- [`PlayerManagerCard.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/modules/player-management/PlayerManagerCard.tsx):
  - Unified Material UI Card with input field, add button (with Enter key support), inline warning feedback, and chips with delete icons on every player.
- [`index.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/modules/player-management/index.ts):
  - Public export entrypoint.
- [`useLobbyPlayers.test.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/modules/player-management/useLobbyPlayers.test.ts):
  - Comprehensive unit test suite (10 tests) covering adding players, duplicate rejection, trimming, player removal down to 0, index-based removal, and remote toggles.

### 2. Integration into GuessArt
- [`useGuessArtLobby.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/games/guessart/hooks/useGuessArtLobby.ts):
  - Replaced duplicate player state logic with `useLobbyPlayers`.
- [`GameSetup.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/games/guessart/components/GameSetup.tsx):
  - Replaced manual player card markup with `<PlayerManagerCard />`.

### 3. Integration into Geschichtenschreiber (Storyteller)
- [`useStorytellerLobby.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/games/storyteller/hooks/useStorytellerLobby.ts):
  - Replaced custom player array with `useLobbyPlayers`.
- [`StoryLobby.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/games/storyteller/components/StoryLobby.tsx):
  - Replaced manual player card markup with `<PlayerManagerCard />`.
  - Removed previous restriction `players.length > 2`, allowing users to delete "Spieler 1" and "Spieler 2".

### 4. Localization
- Added `lobby` translation keys to both:
  - [`public/locales/de/translation.json`](file:///home/deck/Projects/LocalGameGalaxy/public/locales/de/translation.json)
  - [`public/locales/en/translation.json`](file:///home/deck/Projects/LocalGameGalaxy/public/locales/en/translation.json)

---

## Verification Results

### 1. Unit Tests (`npm test`)
```bash
 ✓ src/modules/player-management/useLobbyPlayers.test.ts (10 tests)
 ✓ src/games/storyteller/logic/storyteller.test.ts (13 tests)
 ✓ src/games/guessart/logic/guessart.test.ts (20 tests)
 ✓ src/games/guessart/logic/guessartNotification.test.ts (10 tests)
 ...
 Test Files  15 passed (15)
      Tests  121 passed (121)
```

### 2. Linting (`npm run lint`)
```bash
eslint .
✖ 458 problems (0 errors, 458 warnings)
```
0 ESLint errors introduced.

### 3. TypeScript & Build (`npm run build`)
```bash
tsc -b && vite build
✓ built in 50.12s
PWA v1.2.0 generateSW
```
Compilation and bundling completed with 0 errors.

---

## Documentation Updates
- Updated [`docs/tech/architecture.md`](file:///home/deck/Projects/LocalGameGalaxy/docs/tech/architecture.md) with `src/modules/*` and `src/modules/player-management`.
- Updated [`docs/tasks/shared-player-management-module-tasks.md`](file:///home/deck/Projects/LocalGameGalaxy/docs/tasks/shared-player-management-module-tasks.md).
