## 2026-11-28 — Melodiq host state publisher and mic pipeline simplified (agent)

- `docs/tech/melodiq-architecture.md`: §2.9 host game state paragraph (single publisher `useHostGameUpdate`, `logic/hostStateStream.ts`, players built on demand); Audio Streaming bullet (phones send pitch only, no audio track; `detectPitch`).
- `docs/reports/2026-11-27-melodiq-tv-lag-analysis.md`: #1 entry points at the new publisher.
- Code outside `docs/` changed (`useHostGameUpdate.ts`, `hostStateStream.ts`, `useTVMode.ts`, `WebRTCMicManager.ts`, `AudioUtils.ts`, `MicrophoneManager.ts`, `useMelodiqSessionCore.ts`).
- §2.9 stem/video row: `useLocalMediaSync` loop is the only stem/video controller (event listeners removed; they attached before the elements mounted), buffering via `readyState`, YouTube via `SEEK_ONLY_VIDEO_DRIFT_POLICY`.
- §2.9: settings reach the TV only via `SETTINGS_UPDATE` (snapshot of `TV_SETTING_KEYS` on connect, filtered changes); lyrics values no longer travel in `GAME_STATE`.
