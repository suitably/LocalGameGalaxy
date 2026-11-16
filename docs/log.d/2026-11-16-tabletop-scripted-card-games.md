## 2026-11-16 — Scripted card games on the Spieltisch (claude-code)

- `docs/tech/tabletop-scripted-games.md`: new — script contract, session reducer, room and local play, TV table and phone views, storage, the rules of Schwimmen, Durak, Arschloch and Skat as implemented, and the existing scripts that were checked.
- `docs/tech/index.md`, `docs/tech/tabletop-engine.md`: linked it; `TabletopEntry.tsx` picks between the engine and the scripted games.
- `docs/tech/persistence.md`: `STORAGE_PREFIXES.TABLETOP_SCRIPTED`.
- `docs/open-questions.md`: Q24 — scripted card games send all hands to every device in the room.
