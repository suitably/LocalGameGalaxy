## 2026-11-22 — Notes library: song choice on save, score labels on upload, moving songs, re-scan (agent)

- `docs/tech/song-pipeline.md` §4: `POST /api/songs/:id/files` takes an optional `label`; new `POST /api/songs/:id/merge` and `POST /api/notes/library/rescan`; saving a new score asks for the target song (`SongChoiceDialog`, `rankSongChoices`) (#563). `verified.at` 2026-11-22.
