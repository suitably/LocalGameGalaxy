## 2026-11-15 — Q4 resolved: Melodiq BroadcastChannels moved to useMultiChannelSync (claude-code)

- `open-questions.md`: Q4 removed, recorded under "Resolved 2026-11-15" (maintainer decision: migrate).
- `tech/sync-protocol.md` §3: new `selfEcho` option and publish-only use of `enabled: false`; Melodiq listed as a user with its channel constants (`src/games/melodiq/logic/syncChannels.ts`).
- `AGENTS.md` §4, `tech/coding-conventions.md`, `tech/architecture.md` §4, `tech/game-catalog.md`: Melodiq exception removed.
- Code outside `docs/` changed: `src/modules/sync/useMultiChannelSync.ts` and Melodiq's `useTVMode`, `useTVReceiver`, `SettingsContext`, `useSessionEnd`, `useQueue`.
