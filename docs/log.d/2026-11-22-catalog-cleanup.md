## 2026-11-22 — Catalogue restructure phase 7.1 cleanup (agent)

- `docs/tech/i18n-strategy.md`: every game has a bundle; shared keys that stay global; current top-level namespaces.
- `docs/tech/game-catalog.md` §4, `docs/tech/architecture.md` (tree: `public/locales`, `src/lib/i18n/`), `docs/tech/tabletop-scripted-games.md` (script texts in the Spieltisch bundle), `docs/tech/index.md`, `AGENTS.md` §6.
- `docs/tasks/GAME-CATALOG-RESTRUCTURE.md` §7: 6.2 and 7.1 done; 6.1 audit and the open Melodiq RPC question.
- Code outside `docs/` changed (dead translation keys, `scripts/scaffold-game.mjs`, `scripts/check-docs-sync.mjs`).
- `docs/open-questions.md`: Q26 (Melodiq phone RPC transport).
- `docs/open-questions.md` Q26 and the task doc: maintainer chose the WebRTC room transport; tracked in #813.
