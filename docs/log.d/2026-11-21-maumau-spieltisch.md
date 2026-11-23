## 2026-11-21 — Mau-Mau moves onto the Spieltisch (agent)

- New spec `docs/tasks/CARD-GAMES-TO-SPIELTISCH.md`: the standalone card games (Mau-Mau, Schwarzer Peter, Golf, Cabo) become Spieltisch rule scripts, the `cards` tracker is listed there as a score tracker; one PR per game. Listed in `docs/tasks/index.md`.
- `docs/tech/tabletop-scripted-games.md` §5: Mau-Mau rules as implemented in `scripted/logic/maumau.ts`.
- `docs/tech/game-catalog.md`: `maumau` hub rows removed, note on scripted card games; `docs/tech/architecture.md` §3.2 and AGENTS.md §6 no longer list `maumau`.
