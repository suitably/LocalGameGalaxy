## 2026-11-08 — Notes batch import needs a duration match or a confirmation (claude-code)

- `docs/tech/song-pipeline.md`: batch import takes a YouTube hit only within max(8 s, 10 % of the score length) or after the user picks it; otherwise the score is skipped (#691).
