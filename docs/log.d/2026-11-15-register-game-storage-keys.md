## 2026-11-15 — Q8: game-local storage keys registered in STORAGE_KEYS (claude-code)

- `docs/tech/game-catalog.md` §2: qwixx, knister, kniffel, guessart, storyteller and cards rows now name the `STORAGE_KEYS` / `STORAGE_PREFIXES` entries.
- `docs/tech/persistence.md`: key groups and prefixes list updated; `EXCALIDRAW_DRAWING` removed.
- `AGENTS.md`, `docs/tech/architecture.md`: dropped the "known gap — Q8" mentions.
- `docs/open-questions.md`: Q8 resolved (maintainer decision 2026-11-15).
- Outside `docs/`: `src/lib/storage.ts` gains `KNIFFEL_*`, `GUESSART_*`, `STORYTELLER_*`, `KNISTER_HIGHSCORE` keys and four per-game prefixes (same strings as before); the game files use them instead of local constants.
