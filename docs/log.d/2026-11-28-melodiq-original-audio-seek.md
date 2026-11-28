## 2026-11-28 — Melodiq plays VBR MP3 master tracks as WAV for exact seeks (agent)

- `docs/tech/melodiq-architecture.md` §2.4: new "Exact seeking" item (measurement, `exactSeekUrl`, live resume position on mode switch).
- `docs/tech/architecture.md` §3.2, `docs/tech/song-pipeline.md`, `docs/tech/melodiq-notes-architecture.md`: exact-seek helpers moved from `src/games/melodiq-notes/stage/logic/exactSeek.ts` to `src/modules/audio/exactSeek/`.
- Code outside `docs/` changed (`src/modules/audio/exactSeek/`, `gameplay/hooks/useMediaLoaders.ts`, `gameplay/hooks/useSessionAudioController.ts`, `melodiq-notes/stage/useExactRecordingUrl.ts`).
