## 2026-11-28 — Melodiq phone pitch as dated frames, scored at capture time (agent)

- `docs/tech/melodiq-architecture.md` Audio Streaming: dated pitch frames (#882), host dating by heartbeat round trip, scoring at capture time, why frames stay on the reliable channel.
- `docs/tech/sync-protocol.md` §4: new `pitch` message shape.
- Code outside `docs/` changed (`logic/pitchFrames.ts`, `gameplay/logic/pitchMatch.ts`, `hooks/usePhoneMicStreaming.ts`, `audio/WebRTCMicManager.ts`, `gameplay/hooks/PlayerRuntime.ts`, `gameplay/hooks/useScoringEngine.ts`, `src/lib/webrtc/heartbeat.ts`, `src/lib/webrtc/WebRTCHostManager.ts`).
