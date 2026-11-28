## 2026-11-28 — Melodiq GAME_STATE carries isPausedForScore (agent)

- `docs/tech/sync-protocol.md` §5: the host's results flags (`isFinished`, `isPausedForScore`) travel with every `GAME_STATE`.
- Code outside `docs/` changed (`hooks/usePlaybackReporting.ts`, `components/PlaybackManager.tsx`).
