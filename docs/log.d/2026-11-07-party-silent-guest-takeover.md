## 2026-11-07 — Host takeover ignores a guest that is itself offline (claude-code)

- `docs/tech/sync-protocol.md` (party roster): a silent host is only replaced while this device still hears another player; `usePartyRoomPlayers` fixes `isHost` for a running game; harness scenario for a guest cut off for 30 s; `HEARING_GAP_MS`/`hearingSince`: silence during this device's own outage is not counted.
