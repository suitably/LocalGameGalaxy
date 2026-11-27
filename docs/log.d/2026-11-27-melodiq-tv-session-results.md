## 2026-11-27 — Melodiq session results streamed to the TV (agent)

- `docs/tech/sync-protocol.md` §4.3: new host → TV message `SESSION_RESULTS` (`logic/tvSessionResults.ts`, DOM event `melodiq_session_results`).
- Code outside `docs/` changed (`useSessionResultsBroadcast`, `useTVMode`, `useTVReceiver`, `MelodiqSessionProps.passiveResults`).
