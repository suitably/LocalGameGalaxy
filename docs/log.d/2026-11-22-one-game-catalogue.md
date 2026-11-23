## 2026-11-22 — One game catalogue, phases 0–2 (agent)

- `docs/adr/0011-one-game-catalogue.md`: new ADR; listed in `docs/adr/index.md`.
- `docs/tech/game-catalog.md`, `architecture.md` §3.1, `data-models.md`: games are declared in `src/games/<id>/definition.tsx` and collected in `src/lib/catalog/`; `category` replaced by area · listing; Gartic Phone is a hidden catalogue entry; the `cards` row repaired.
- `docs/tech/coding-conventions.md`: rule "hand-kept game list" (check:architecture rule 11).
- `docs/tech/tabletop-engine.md`, `tabletop-scripted-games.md`, `DESIGN.md`, `scripts/README.md`, `AGENTS.md` §10: point to the catalogue instead of `tableCatalog` lists, `gameRegistry.tsx` and `extraGameEntries.ts`.
- `docs/tasks/GAME-CATALOG-RESTRUCTURE.md`: phases 0–2 done.
