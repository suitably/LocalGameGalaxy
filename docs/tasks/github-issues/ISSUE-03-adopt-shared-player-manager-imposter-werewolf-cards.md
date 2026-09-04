---
title: "[Refactor][SOLID] Adopt Shared PlayerManagerCard & useLobbyPlayers in Imposter, Werewolf, and Cards"
labels: ["refactor", "solid", "ui", "player-management"]
assignees: []
---

## Summary
The project recently introduced `src/modules/player-management/` (`PlayerManagerCard` and `useLobbyPlayers`), which is currently only adopted by `guessart` and `storyteller`. `imposter`, `werewolf`, and `cards` still implement fragmented, duplicated, and buggy player setups.

## Problem Details
1. **Verbatim Copy-Paste & i18n Contamination:**
   [`src/games/imposter/components/GameSetup.tsx:L126-L171`](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/components/GameSetup.tsx#L126-L171) is an exact copy-paste of [`src/games/werewolf/components/GameSetup.tsx:L115-L160`](file:///home/deck/Projects/LocalGameGalaxy/src/games/werewolf/components/GameSetup.tsx#L115-L160). Imposter literally uses Werewolf's translation keys:
   ```tsx
   <TextField label={t('games.werewolf.ui.player_name')} ... />
   <Button>{t('games.werewolf.ui.add')}</Button>
   ```
2. **Data Loss on Refresh in Cards:**
   [`CardsLobby.tsx:L29`](file:///home/deck/Projects/LocalGameGalaxy/src/games/cards/components/CardsLobby.tsx#L29) uses unpersisted local state `useState<string[]>`. Any page refresh or accidental swipe wipes out the player roster.
3. **UI Inconsistency:**
   While GuessArt and Storyteller use compact, horizontal MUI Chip badges with delete icons, Imposter and Werewolf render a vertical `<List dense>` consuming massive screen space.

## Proposed Solution (SOLID: DRY & Single Responsibility)
1. In `imposter`:
   - Replace the player Paper in `GameSetup.tsx` with `<PlayerManagerCard />`.
   - Migrate player state in `ImposterGame.tsx` to `useLobbyPlayers({ storageKey: STORAGE_KEYS.IMPOSTER_SETUP_PLAYERS, minPlayers: 3, maxPlayers: 20 })`.
2. In `werewolf`:
   - Replace the player Paper in `GameSetup.tsx` with `<PlayerManagerCard />`.
   - Connect to `useLobbyPlayers` or sync with `WerewolfGameContext`.
3. In `cards`:
   - Replace unpersisted `useState<string[]>` with `useLobbyPlayers({ storageKey: 'cards_lobby_players', defaultPlayers: ['Spieler 1', 'Spieler 2', 'Spieler 3'], minPlayers: 2, maxPlayers: 10 })`.
   - Render `<PlayerManagerCard />` in `CardsLobby.tsx`.

## Affected Files
- `src/games/imposter/components/GameSetup.tsx`
- `src/games/imposter/ImposterGame.tsx`
- `src/games/werewolf/components/GameSetup.tsx`
- `src/games/cards/components/CardsLobby.tsx`

## Acceptance Criteria
- [ ] Imposter no longer imports or references `games.werewolf.ui.*` translations.
- [ ] Players in Cards persist across browser reloads.
- [ ] All multiplayer game lobbies present identical player chip styling and interaction behavior.
- [ ] Deletion of ~200 lines of duplicated player setup code.
