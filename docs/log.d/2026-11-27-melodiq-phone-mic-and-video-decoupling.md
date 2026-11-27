## 2026-11-27 — Melodiq phone mic detection and video decoupled from audio (agent)

- `docs/tech/melodiq-architecture.md`: §2.9 video row (video never holds back audio/lyrics, smoothed drift, 2 s seek cooldown, no video seek on TV audio resync); Audio Streaming bullet (phone pitch detection gate, clarity check, frequency range, non-blocking `AudioContext.resume()`).
- `docs/tech/melodiq-notes-architecture.md`: microphone input bullet names the changed `autoCorrelate`.
- `docs/reports/2026-11-27-melodiq-tv-lag-analysis.md`: status section, #3 and #4 done.
- Code outside `docs/` changed (`AudioUtils.ts`, `MicrophoneManager.ts`, `useLocalMediaSync.ts`, `usePlaybackControls.ts`, `usePassiveSync.ts`, `createYouTubeVideoAdapter.ts`).
- `docs/tech/melodiq-architecture.md` §2.9 and the lag report: host → TV stream (30/s, segment deltas, render gate, background ticker); report #1, #2, #7 done.
