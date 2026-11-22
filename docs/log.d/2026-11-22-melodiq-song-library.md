## 2026-11-22 — Melodiq song library with favourites and playlists per API user (agent)

- `docs/adr/0010-melodiq-song-library.md`: new ADR (status Accepted 2026-11-22): library UI, `SongLibraryStore` (companion / local), per-user `melodiq-library.json`, shared playlists read-only for others, album from `#ALBUM` or `song.json`, one-time import of `playlists.json` without tokens.
- `docs/tech/melodiq-architecture.md`: new §2.12 (tabs, components, logic, store choice, provider); `verified` updated.
- `docs/tech/song-pipeline.md` §3: `/api/melodiq/library/*` routes replace `/api/playlists…`; `album` on `/api/songs`.
- `docs/tech/persistence.md`: `melodiq-library.json` replaces `playlists.json`, `MELODIQ_FAVORITES` key, Dexie `playlists` role; `verified` updated.
- `docs/tech/server-security.md`, `docs/tech/architecture.md`: auth path list and melodiq plugin summary name the song library routes.
- `docs/operations/{backup-recovery,server-runbook,monitoring-scaling}.md`: `playlists.json` → `melodiq-library.json`.
