## 2026-11-28 — Melodiq phone commands checked against the sender's role (agent)

- `docs/tech/melodiq-architecture.md` remote commands: role table `canSendRemoteCommand` (#837, graduated roles), checks in both host consumers, play/next hidden for roles without playback rights; the phone's calibration beep plays on the host.
- Code outside `docs/` changed (`logic/remoteCommands.ts`, `hooks/useHostRemoteCommands.ts`, `gameplay/hooks/usePeerSessionMessages.ts`, `components/PlaybackManager.tsx`, `gameplay/components/SessionStage.tsx`).
