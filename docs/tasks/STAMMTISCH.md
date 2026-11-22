---
type: Task
title: 'Stammtisch: a saved party room with remote help (act for a player, show markers)'
description: 'Spec for a persistent, named party room that every member re-enters with one tap (optionally on app start), plus two ways to help another player from your own device: act for their seat, or place a marker on their screen that shows where to tap. First game: Kniffel.'
tags: [party, room-game, stammtisch, assist, markers, kniffel, spec]
status: draft
generated:
  at: 2026-11-22T12:00:00+01:00
  by: claude-code
verified:
  at: 2026-11-22
  method: 'Read src/features/party/hooks/{usePartyRoomGame,usePartyLobbyController,useFollowPartyLobby}.ts, src/features/party/logic/{universalPartyManager,partySession}.ts, src/modules/room-game/{roomSync,useRoomEvents,index}.ts, src/modules/sync/roomKeys.ts, src/games/kniffel/{KniffelRoomGame.tsx,logic/kniffelRoom.ts}, src/games/tabletop/scripted/logic/session.ts (sessionAllows).'
sources:
  - 'src/features/party/hooks/usePartyRoomGame.ts'
  - 'src/features/party/logic/universalPartyManager.ts'
  - 'src/modules/room-game/useRoomEvents.ts'
  - 'src/games/kniffel/logic/kniffelRoom.ts'
---

# Stammtisch

## 1. Request (maintainer, 2026-11-22)

- Play with relatives who are not good with apps. They only have to open the app; a helper who is connected can do the rest.
- A **persistent room**, named **Stammtisch**: everyone who belongs to it can come back to it any time.
- The helper can either **act on the other player's behalf** or **show them where to tap** by placing markers on their screen.
- First games: **Kniffel**, plus the international rule variant of the same game.
- No wording that names a specific person or age group (no "Oma", "senior"): the feature is "Stammtisch" and "help".

## 2. Facts (what exists — reuse, never re-implement)

| Need                       | Exists                                                                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Remote room                | Party room over `getRoomTransport(roomId)` (BroadcastChannel + MQTT `lgg/room`), encrypted with the room key (`src/modules/sync/roomKeys.ts`: `getRoomKey`, `setRoomKey`, `ensureRoomKey`); the share link carries code + key.             |
| Guests follow the host     | Into a game: `usePartyLobbyController.ts` (`shouldFollowIntoGame` → `resolveGameRoute`). Back to the lobby: `useFollowPartyLobby`. A guest never has to pick a game.                                                                       |
| Host comes and goes        | Host id is per tab (`sessionStorageSafe`, `STORAGE_PREFIXES.PARTY_HOST_ID`); a guest takes over after `HOST_TIMEOUT_MS` (20 s) without the host (`partySession.ts`: `shouldTakeOverHost`, `takeOverHost`, `hostEpoch`).                    |
| Room state on this device  | `STORAGE_PREFIXES.PARTY_STATE + roomId` (last roster); `STORAGE_KEYS.HOST_ROOM_CODE` (code this device hosted last).                                                                                                                       |
| Host-run dice games        | `usePartyRoomGame` (`features/party/hooks`) for Knister, Kniffel, Qwixx: `useRoomReducer` with a per-game `authorize(state, action, from)`. Kniffel: `kniffelRoomAllows` lets only the active player roll/hold/score, only the host start. |
| Live, short-lived messages | `useRoomEvents` (`modules/room-game`, channel `<gameKey>_<roomId>_live`): every device gets each event once, nothing is kept, no ordering guarantee.                                                                                       |
| Spieltisch host override   | `sessionAllows` (`tabletop/scripted/logic/session.ts`) already accepts **every** action from the host — but the host cannot see a sealed hand of another seat, so acting for a seat there needs the seat's packet (phase 4).               |

## 3. Decisions

### 3.1 Stammtisch = a saved party room

- A device keeps a list of saved rooms: `{ roomId, roomKey, name, savedAt }[]` under a new `STORAGE_KEYS.STAMMTISCH_ROOMS` (default name "Stammtisch"; renaming allowed, several Stammtische allowed — family, friends).
- Saving: in the party lobby, "Save as Stammtisch". Opening a Stammtisch share link offers the same.
- Re-entering: the hub shows a Stammtisch tile per saved room → `/party?room=<roomId>` with the stored key. Whoever arrives first hosts; the existing takeover covers the host leaving.
- Per-device setting **"Open Stammtisch on start"** (off by default; pick one saved room). On a device where it is on, the app starts in that room's lobby and shows a large "Waiting for the others" state while nobody else is there. This is the "only open the app" path.
- The room code/key never change, so links and saved entries stay valid. Removing a player (`left`) stays possible; a removed member re-joins via "Wieder beitreten" (`PartyRemovedNotice`).

### 3.2 Help, mode A — act for a player

- **Consent on the helped device.** A player grants help on their own device ("Let others help me": everyone in the room, or chosen players). The grant is part of that player's roster entry: new optional field `PartyPlayer.helpers?: string[] | 'all'`, merged like the rest of the entry (`updatedAt` wins). Only the player's own device writes it.
- **Generic in `usePartyRoomGame`**, not per game: the host wraps the game's `authorize` — an action from `from` is allowed if `authorize(state, action, from)` passes, or if `from` is a helper of some player `p` and `authorize(state, action, p)` passes. Kniffel, Knister and Qwixx get it at once; their reducers do not change.
- The hook returns `canActFor(playerId)`; the game's UI enables its controls when the active player is me **or** someone I may help (Kniffel: `myTurn` in `KniffelRoomGame.tsx`).
- **Visible on the helped device:** a short notice per action from someone else on their behalf ("Max rolled for you", "Max entered Full House"). Needs the sender in the applied action: the host stamps `by` (actual sender) when it differs from the acting seat. **Unverified:** whether `useRoomReducer` exposes the sender to the reducer or only to `authorize` — check before slice 2.
- Trust boundary unchanged: anyone with the room key can claim any player id; help adds no new exposure beyond that.

### 3.3 Help, mode B — markers ("tap here")

- The helper switches on **"Show"** (header action) and taps an element; instead of acting, the device sends a marker event over `useRoomEvents` (gameKey `stammtisch-marker`, room channel): `{ type: 'marker', to: playerId | 'all', target: string, by: playerId, at: number }`, and `{ type: 'clear', to, by }`.
- **Targets are semantic, not coordinates** — screens differ in size and layout. Interactive elements carry `data-room-target="<game>.<id>"` (Kniffel: `kniffel.die.0`–`4`, `kniffel.roll`, `kniffel.row.<category>`). The receiver finds the element with that attribute and draws a pulsing ring around it (theme tokens, no hex), scrolls it into view, optionally plays a short sound. Unknown target → ignored.
- The marker disappears when the helped player taps it, after 15 s, or on `clear`. Stale or repeated events (MQTT redelivery on join) are dropped by `at` older than 30 s.
- Shared code: marker logic and the overlay in `src/features/party/` (`useRoomMarkers`, `RoomMarkerLayer`) — any room game can opt in by tagging elements.
- Works only where the helper sees the same element: true for Kniffel/Knister/Qwixx (shared dice and sheet). For own sheets (Qwixx) the helper targets the other player's sheet only if it is visible on the helper's screen — phase 3 checks this per game.

### 3.4 Kniffel rule variant

- Kniffel stays the game. Add a table setting **rules: `kniffel` (default) | `international`** to `kniffelRoomReducer`'s `START` (and the local game): international = extra five-of-a-kind scores a 100-point bonus each and the joker rule for the lower section. The UI never uses the other game's trademarked name.
- Pure logic + tests in `src/games/kniffel/logic/` first.

## 4. Slices (one PR each, in order)

1. **Stammtisch rooms** — storage key + pure helpers (`logic/stammtisch.ts`: add, rename, remove, find) with tests; "Save as Stammtisch" in the lobby; hub tile; "Open Stammtisch on start" setting and the waiting state. Docs: `persistence.md` (key), `architecture.md`/`game-catalog.md` (party), locales de/en.
2. **Resume after a host change** — see Q1: host persists room game state; a guest taking over seeds its host peer from its last received state (higher `rev` wins). Tests in `modules/room-game`.
3. **Act for a player** — `PartyPlayer.helpers`, consent switch in the lobby (own entry only), authorize wrapper + `canActFor` in `usePartyRoomGame`, Kniffel UI uses it, "X did Y for you" notice. Tests for the wrapper (pure function in `features/party/logic/`).
4. **Markers** — `useRoomMarkers` + `RoomMarkerLayer` + header "Show" action; tag Kniffel elements; then Knister and Qwixx. Docs: `sync-protocol.md` (new live channel).
5. **Kniffel international rules** — logic, tests, table setting.
6. Later, separate decision: help in Spieltisch card games (needs the helped seat's sealed packet on the helper's device) and a larger-type display setting.

## 5. Open points (decide before the slice that needs them)

- Q1 (slice 2): A running match does **not** survive a host change today: the host's `RoomStatePeer` is the only authoritative copy (`roomPeerRegistry.ts` header), a new host starts from `initialState`, and `usePartyRoomGame` deals again (`needsStart`). Guests do hold the last state they rendered. Proposal (slice 2, before help): the host persists its state per room and game, and a guest that takes over seeds its host peer from its last received state (higher `rev` wins), so a Stammtisch match can be paused and resumed.
- Q2 (slice 3): Grant scope default — "everyone in this Stammtisch" or "chosen players"? Proposal: everyone, switchable.
- Q3 (slice 4): Should a helper be able to mark elements on screens of players who did not grant help? Proposal: markers need no grant (they only point), acting does.

## 6. Progress

| Slice | State |
| ----- | ----- |
| 1     | open  |
| 2     | open  |
| 3     | open  |
| 4     | open  |
| 5     | open  |
