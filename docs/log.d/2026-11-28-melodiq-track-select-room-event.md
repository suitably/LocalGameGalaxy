## 2026-11-28 — Melodiq part choice as a remote command, dead phone RPC removed (agent)

- `docs/tech/melodiq-architecture.md`: part mic sends `track.select` (room event); `configure`, `history_report` and the host's `stats` message removed (#836); command list includes `track.select`.
- `docs/tech/sync-protocol.md` §4: `configure` row removed.
- Code outside `docs/` changed (`logic/remoteCommands.ts`, `gameplay/logic/trackChoice.ts`, `gameplay/hooks/usePhoneTrackChoice.ts`, `gameplay/hooks/usePeerSessionMessages.ts`, `hooks/useHostPhoneJoin.ts`, `gameplay/hooks/useSessionEnd.ts`, `gameplay/hooks/useSessionPlayers.ts`, `gameplay/hooks/useMelodiqSessionCore.ts`, `hooks/useMelodiqGlobalEvents.tsx`; `hooks/useRemoteConfigListener.ts` deleted).
