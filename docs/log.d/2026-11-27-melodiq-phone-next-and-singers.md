## 2026-11-27 — Melodiq phone next and current-singer edits go to the host (agent)

- `docs/tech/melodiq-architecture.md` §2.13: new room `melodiq-current-participants` (`logic/currentParticipantsRoom.ts`, `hooks/useCurrentParticipantsRoom.ts`) with requests `current_participants.toggle` / `.reorder`; phone MiniPlayer shows `nowPlaying`. §2.15: remote commands always go to `melodiq_host_command` (the TV ignores `REMOTE_COMMAND`); `usePeerSessionMessages` no longer handles `next`. §2.16 table updated.
- Code outside `docs/` changed (`useHostRemoteCommands`, `useHostPlaybackCommands`, `useActiveParticipants`, `PlaybackManager`, `queueParticipantUtils`).
