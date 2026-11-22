## 2026-11-22 — Werewolf party room, phase 4.1 (agent)

- `docs/tech/werewolf-architecture.md` §6a (new): room mode on `useSealedPartyGame`, room layer `logic/werewolfRoom.ts` over `gameReducer`, per-seat views, supported roles, host narration, pack vote for the wolves.
- `docs/tech/game-catalog.md`: Werewolf's party-room sync and shared imports.
- `docs/tech/architecture.md`: Werewolf is a user of `room-game/sealed`; feature row mentions the party room.
- `docs/tasks/GAME-CATALOG-RESTRUCTURE.md`, `docs/tasks/index.md`: 4.1 done.
- Code outside `docs/` changed (Werewolf room mode, party wiring, locales).
