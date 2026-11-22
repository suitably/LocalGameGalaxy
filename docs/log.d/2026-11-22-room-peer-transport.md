## 2026-11-22 — WebRTC peer RoomTransport, step 1 of #813 (agent)

- `docs/tech/architecture.md` §3.2 `room-game` row: `peerTransport.ts` (WebRTC star transport with sender stamping and `to` addressing).
- Code outside `docs/` changed (`src/modules/room-game/peerTransport.ts`, `useWebRTCClient` `addMessageListener`); nothing uses the transport yet.
