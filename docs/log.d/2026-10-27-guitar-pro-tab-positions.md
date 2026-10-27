## 2026-10-27 — Guitar Pro string/fret positions reach the stage (claude-code)

- `docs/tech/architecture.md` §3.2 `music-score`: `parseGuitarPro` keeps each note's written position as `ScoreNote.tab`; `assignTab` uses it when it fits the stage tuning.
