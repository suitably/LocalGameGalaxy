## 2026-11-16 — Tabletop game menu moved to the global header (agent)

- `docs/tech/tabletop-engine.md`: new "Game menu in the header" paragraph (`TableGameMenu` + `hooks/useTabletopHeader.tsx` + `logic/headerMenu.ts`, entries per view, why the table settings stay a dialog instead of a game-settings registry section); `EditorToolbar` no longer carries the table settings; restart entry location updated.
- Code outside `docs/` changed: `src/games/tabletop` (header menu, selection bar position, aria labels) and tabletop keys in `public/locales/{de,en}`.
