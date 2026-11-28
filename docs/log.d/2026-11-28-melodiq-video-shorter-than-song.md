## 2026-11-28 — Melodiq leaves a background video shorter than the song to end (agent)

- `docs/tech/melodiq-architecture.md` §2.9 sync table: `isPastVideoEnd`, YouTube adapter `duration`.
- Code outside `docs/` changed (`gameplay/logic/mediaDrift.ts`, `gameplay/hooks/useLocalMediaSync.ts`, `gameplay/createYouTubeVideoAdapter.ts`, `gameplay/youtubeApi.ts`).
