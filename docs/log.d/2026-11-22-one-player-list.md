## 2026-11-22 — One local player list, phase 5.1 (agent)

- `docs/tech/persistence.md`: new group "Local players" with `LOBBY_PLAYERS`; old per-game roster keys are migration only.
- `docs/tech/game-catalog.md`: cards, GuessArt and Storyteller rosters live in `LOBBY_PLAYERS` (fixes the stale "literal `'cards_lobby_players'`" note).
- `docs/tech/architecture.md`: `player-management` row names the shared roster and `lobbyRoster.ts`; tabletop added as a user.
- `docs/tech/tabletop-scripted-games.md`: one-device lobby uses the shared roster.
- `docs/tasks/GAME-CATALOG-RESTRUCTURE.md`: 5.1 done.
- Code outside `docs/` changed (`useLobbyPlayers`, `lobbyRoster.ts`, `STORAGE_KEYS.LOBBY_PLAYERS`, five lobbies).
