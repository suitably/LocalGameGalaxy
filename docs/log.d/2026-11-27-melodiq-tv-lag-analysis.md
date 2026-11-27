## 2026-11-27 — Melodiq TV lag analysis and YouTube consent in GAME_STATE (agent)

- New report `docs/reports/2026-11-27-melodiq-tv-lag-analysis.md` (ranked causes of TV lag and stutter), linked from `docs/reports/index.md`.
- Code outside `docs/` changed (`usePlaybackReporting` now sends `youTubeConsent` with every `GAME_STATE`; before, only the unused `getGameState()` carried it).
