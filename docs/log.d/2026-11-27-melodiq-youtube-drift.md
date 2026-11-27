## 2026-11-27 — Melodiq YouTube background: seek-only drift correction (agent)

- `docs/tech/melodiq-architecture.md` §2.9 sync table: YouTube backgrounds use `YOUTUBE_DRIFT_POLICY` (seek only, above 400 ms, not while buffering); the TV's follower seek moves audio and stem only.
- `docs/reports/2026-11-27-melodiq-tv-lag-analysis.md`: status section, #3 and #4 fixed.
- Code outside `docs/` changed (`mediaDrift.ts`, `createYouTubeVideoAdapter.ts`, `useLocalMediaSync.ts`, `usePassiveSync.ts`).
