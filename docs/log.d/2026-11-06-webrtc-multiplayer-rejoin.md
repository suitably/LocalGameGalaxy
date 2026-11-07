## 2026-11-06 — WebRTC client: swarm exit, re-announce, reconnect after error documented (claude-code)

- `docs/tech/webrtc-signaling.md` §3: connected phones leave the tracker swarm; searching phones re-announce (`discoveryRetry.ts`); `MAX_CANDIDATES` is 4, not 5.
- §4: `CONNECTION_TIMEOUT_MS` is 6 s, the reconnect delay 1.5 s; reconnect now also follows an `error`.
