## 2026-11-22 — Melodiq phone feedback as room events (agent)

- `docs/tech/melodiq-architecture.md` §2.8: feedback now uses `feedback.submit` / `feedback.result` room events; documents `useMelodiqRoomTransport` wiring; old `host.feedback.*` messages removed.
- Code outside `docs/` changed (Melodiq room transport, feedback protocol, host and phone hooks).
