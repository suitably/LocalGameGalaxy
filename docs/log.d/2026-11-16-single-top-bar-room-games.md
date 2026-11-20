## 2026-11-16 — Single top bar for GuessArt, Storyteller, Gartic Phone, Knister room (claude-code)

- `docs/tech/architecture.md`: removed the `GameHeaderBar` row (component deleted); §3.4 documents the in-game header pattern (title, menu items with `showAlways`, `setHomeAction` back to the party lobby, cleanup on unmount).
- `docs/tech/game-catalog.md`: dependency rows of `garticphone` and `knister` list the header contexts they now use.
- Code outside `docs/` changed: the four games' headers, locales (`guessart.roomBack`, `storyteller.roomBack`, Knister `room_back` removed) and a changelog fragment.
