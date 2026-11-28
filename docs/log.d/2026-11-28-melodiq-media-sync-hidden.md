## 2026-11-28 — Melodiq media sync keeps running without animation frames (agent)

- `docs/tech/melodiq-architecture.md` §2.9 sync table: the stem/video loop falls back to `startSteadyTicker` while the window gets no animation frames.
- Code outside `docs/` changed (`gameplay/hooks/useLocalMediaSync.ts`).
