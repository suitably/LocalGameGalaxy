## 2026-11-23 — Shared code must not import src/games (agent)

- `AGENTS.md` §4, `docs/tech/coding-conventions.md` §2, `docs/tech/architecture.md` §3.1, `scripts/README.md`: new `check:architecture` rule 13 (shared layers must not import from `src/games`; allowlist `src/lib/catalog/entries.ts` plus reasoned entries in `scripts/architecture-baseline.json`).
- `docs/tech/tabletop-engine.md`: `tableCatalog` now in `src/lib/catalog/`, `PlayModeSheet` in `src/components/common/`.
- Code outside `docs/` changed (`melodiqFetch`, `tableCatalog`, `PlayModeSheet` moved; check script).
