---
type: ADR
title: 'ADR-0008: Leftovers of the one-lobby epic (#647, #661)'
description: 'Hub-started Melodiq keeps its own phone pairing screen, GuessArt live mode keeps its limits, the part= preselect link is not restored, a running game keeps its host until the lobby, and the unused Gartic storage keys are removed.'
resource: src/games/melodiq/MelodiqConnection.tsx
tags: [adr, party, lobby, melodiq, guessart, melodiq-notes, storage]
status: stable
generated:
  at: 2026-11-22T12:00:00+01:00
  by: claude-code
verified:
  at: 2026-11-22
  method: 'Read src/games/melodiq/MelodiqConnection.tsx, src/games/melodiq/gameplay/ScoreBoardQrCode.tsx, src/components/connection/connectionUrl.ts, src/lib/storage.ts, docs/tech/sync-protocol.md (host takeover) and the #661 triage comment'
sources:
  - 'src/games/melodiq/MelodiqConnection.tsx'
  - 'src/components/connection/connectionUrl.ts'
  - 'src/lib/storage.ts'
  - 'docs/tech/sync-protocol.md'
  - 'https://github.com/suitably/LocalGameGalaxy/issues/661'
---

# ADR-0008: Leftovers of the one-lobby epic (#647, #661)

## Status

Accepted 2026-11-22. The maintainer asked agents to decide open "needs-decision" items by best practice; this record answers the open points of #661.

## Context

#647 moved the party games onto one lobby. #661 listed what the PRs left open: the Melodiq phone pairing when Melodiq is started from the hub, GuessArt live-mode limits, unused `GARTIC_*_PREFIX` storage keys, the removed Melodiq Notes `part=` preselect link, a real-device round, and host takeover while a game runs.

## Decision

1. **Hub-started Melodiq keeps its own pairing screen** (`MelodiqConnection.tsx`). Both paths already use the same WebRTC transport; the lobby path only passes the lobby room code as party id and `lobby: true` to `buildDeviceConnectionUrl`. The hub screen also carries client roles (singer / remote) and the local-library switch, which the lobby does not have. Forcing a lobby for solo karaoke with phones as microphones would add a step and remove a working offline path without parity. There is one transport, so this is not a second implementation; only the entry screen differs.
2. **GuessArt live mode** keeps its documented limits (no join mid-game, catalogue words only). Mid-game join needs state hand-over of the running round and custom words need moderation; neither is requested by players. Revisit if a player asks.
3. **`part=` preselect is not restored.** The pult has its own part picker and the stage assigns seats automatically; a link parameter would duplicate both. Seat preselection, if wanted later, belongs in the lobby seat model.
4. **A running game keeps its in-memory host until the room returns to the lobby** (as documented in [sync-protocol](../tech/sync-protocol.md)). Moving a live game state to another device mid-round needs per-game state transfer; the session-level takeover covers the lobby.
5. **`GARTIC_STATE_PREFIX` / `GARTIC_HOST_PREFIX` are removed** from `STORAGE_KEYS`. They were session-storage prefixes, so no stored data needs cleaning.
6. **Real-device round:** manual, listed in [owner-checks](../owner-checks.md).

## Consequences

- `buildDeviceConnectionUrl` stays in use by both entry points.
- #661 is closed; only the real-device round is left to the maintainer.
