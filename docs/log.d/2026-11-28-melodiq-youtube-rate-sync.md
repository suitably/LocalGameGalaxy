## 2026-11-28 — Melodiq YouTube background follows by coarse rate runs (agent)

- `docs/tech/melodiq-architecture.md` §2.9 sync table: `COARSE_RATE_VIDEO_DRIFT_POLICY` replaces the seek-only YouTube policy; unstarted/cued players count as paused.
- Code outside `docs/` changed (`gameplay/logic/mediaDrift.ts`, `gameplay/hooks/useLocalMediaSync.ts`, `gameplay/createYouTubeVideoAdapter.ts`).
