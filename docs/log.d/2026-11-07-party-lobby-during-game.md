## 2026-11-07 — Lobby during a running game, watching host, spectator view (claude-code)

- `docs/tech/sync-protocol.md` (one lobby): room games go on while players visit the lobby (`roomPeerRegistry.ts`, `releaseRoomPeers` on a `statusAt` change, `visitedGameAt`/`shouldFollowIntoGame`), "End game" ends them; the host can watch; spectator views per game.
- `docs/tech/architecture.md`: `roomPeerRegistry.ts` in the `room-game` row; shared spectator picker and selection hook.
