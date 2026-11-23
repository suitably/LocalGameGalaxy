## 2026-11-17 — Cabo card game (agent)

- `src/games/cabo/` (new): rules engine in `logic/` (deck, values, powers, turn state machine, scoring), a pure pass-and-play reducer in `hooks/useCaboGame.ts`, and UI components. Reuses `shuffle` (`lib/utils`), `useLobbyPlayers` / `PlayerManagerCard` (`modules/player-management`) and `HandoverCover` (`modules/pass-and-play`).
- `docs/tech/game-catalog.md`: added `cabo` to the registry, persistence and i18n tables.
- Registration: `src/games/cabo/definition.ts` is listed in the new `src/lib/extraGameEntries.ts`, which also takes over the draw pot entry so `gameRegistry.tsx` stays at its 250-line budget.
