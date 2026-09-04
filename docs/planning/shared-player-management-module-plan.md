# Implementation Plan: Shared Player Management Module [ID: PLAN-PLAYER-MANAGEMENT]

## Goal
Allow users in **Geschichtenschreiber** (Storyteller) to remove default players ("Spieler 1", "Spieler 2") to enter custom player names freely, mirroring the flexibility of **GuessArt**. Instead of duplicating the player setup logic and UI across games, extract the player management hook and UI component into a reusable module under `src/modules/player-management` that both GuessArt and Geschichtenschreiber (and future games) can consume. The module must support configurable minimum/maximum players, input validation (empty/duplicate name prevention), and consistent i18n localization.

## Proposed Changes

### 1. New Module: `src/modules/player-management`
- **`types.ts`**:
  - `LobbyPlayerItem`: `{ name: string; isRemote?: boolean }`
  - `UseLobbyPlayersOptions`: `storageKey`, `defaultPlayers`, `minPlayers` (default 2), `maxPlayers`
  - `UseLobbyPlayersResult`: `players`, `addPlayer`, `removePlayer`, `togglePlayerRemote`, `setPlayers`, `hasMinPlayers`, `canAddMore`, `feedback`, `clearFeedback`
  - `PlayerManagerCardProps`: `players`, `onAddPlayer`, `onRemovePlayer`, `onToggleRemote`, `minPlayers`, `maxPlayers`, `title`, `description`, `placeholder`, `cardVariant`, `sx`
- **`useLobbyPlayers.ts`**:
  - Encapsulates localStorage persistence with `storage.getJson` / `storage.setJson`.
  - Supports string array migration to object structure.
  - Adds players with whitespace trimming and case-insensitive uniqueness check.
  - Removes players by name or index without arbitrary minimum player restrictions (allowing deleting "Spieler 1" / "Spieler 2").
  - Tracks `hasMinPlayers` and `canAddMore`.
- **`PlayerManagerCard.tsx`**:
  - MUI Card displaying heading, description, text field + "Hinzufügen" button, inline feedback alert, and chip list.
  - Every chip has `onDelete` active so any player can be deleted.
  - Responsive design matching both light/dark game themes.
- **`index.ts`**:
  - Re-exports all types, `useLobbyPlayers`, and `PlayerManagerCard`.
- **`useLobbyPlayers.test.ts`**:
  - Unit tests verifying adding players, duplicate rejection, removing any player down to 0, minimum player validation, and persistence.

### 2. Integration into GuessArt
- **`src/games/guessart/hooks/useGuessArtLobby.ts`**:
  - Delegate player state and manipulation to `useLobbyPlayers({ storageKey: 'guessart_lobby_players_v2', defaultPlayers: ['Player 1', 'Player 2'], minPlayers: 2 })`.
- **`src/games/guessart/components/GameSetup.tsx`**:
  - Replace custom player card markup with `<PlayerManagerCard />`.

### 3. Integration into Geschichtenschreiber (Storyteller)
- **`src/games/storyteller/hooks/useStorytellerLobby.ts`**:
  - Delegate player state and manipulation to `useLobbyPlayers({ storageKey: 'storyteller_lobby_players', defaultPlayers: ['Spieler 1', 'Spieler 2'], minPlayers: 2 })`.
- **`src/games/storyteller/components/StoryLobby.tsx`**:
  - Replace custom player card markup with `<PlayerManagerCard />`.
  - Ensure start button is disabled when `players.length < minPlayers` and user can remove any player down to 0.

### 4. Localization (i18n)
- **`public/locales/de/translation.json`** & **`public/locales/en/translation.json`**:
  - Add keys under `lobby`:
    - `playersTitle`, `playersSetupDesc`, `playerNamePlaceholder`, `duplicatePlayer`, `minPlayers`, `maxPlayers`, `addPlayer`.

### 5. Documentation & Technical Architecture
- **`docs/tech/architecture.md`**:
  - Document `src/modules/player-management` as shared cross-game module.

## Verification Plan
1. **Unit Tests**:
   - Run `npm test` to verify `useLobbyPlayers.test.ts` and ensure all 14+ existing test suites pass.
2. **Lint**:
   - Run `npm run lint` to verify no ESLint warnings or errors.
3. **Build**:
   - Run `npm run build` (`tsc -b && vite build`) to ensure type safety and bundling pass.
4. **Walkthrough Document**:
   - Create `docs/verification/shared-player-management-module-walkthrough.md`.
