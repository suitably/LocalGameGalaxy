---
type: Task
title: 'One lobby for all multiplayer games: game slices S5–S10, S12 (#647)'
description: 'Spec for the remaining slices of epic #647: Gartic Phone, GuessArt, Storyteller and both Melodiq modes join the party lobby and run on the shared room transport; WebRTC heartbeat; docs and multi-browser harness.'
tags: [party, lobby, room-game, webrtc, task, agents]
status: draft
generated:
  at: 2026-11-07T10:00:00+01:00
  by: claude-code
verified:
  at: 2026-11-07
  method: 'Scout brief (haiku) on src/features/party, src/modules/room-game, src/games/{garticphone,guessart,storyteller,melodiq,melodiq-notes}, src/lib/webrtc; S1–S4 implemented and tested in this session.'
sources:
  - 'https://github.com/suitably/LocalGameGalaxy/issues/647'
---

# One lobby for all multiplayer games (#647)

## Request

Epic #647: one way to play on several devices. Host opens a party room (`/party`), players join, host picks a game, every device follows to `<route>?room=<CODE>`, after a round everyone returns to the same room. Full text, decisions D1–D6 and slice list: the issue. If code and issue disagree, code wins.

## Facts (already in place on this branch)

- **S1** `resolvePendingLaunch()` (`src/features/party/logic/partyRoutes.ts`) accepts every `PartyGameType` from the list `LAUNCHABLE_GAMES` — add new game types there. The host also gets the preselection when re-opening its own room.
- **S2** `InvitePlayersButton` (`src/features/party/components/InvitePlayersButton.tsx`, props `game`, `gameId?`, `variant: 'icon' | 'button'`) navigates to `buildInviteRoute()` → `/party?[room=…&]launch=<game>`. Games may import from `src/features/party` (Knister does).
- **S3** `usePartyRoomPlayers(roomId)` → `{ players: RoomPlayer[], myId, me, isHost }`, `RoomPlayer = { id, name, seat, isHost }` (pure `roomPlayersOf` in `logic/partyRoster.ts`). This is the only roster games use in live mode — no name entry.
- **S4** `src/modules/room-game`: `useRoomReducer({ gameKey, roomId, playerId, isHost, reducer, authorize?, initialState, enabled?, transport? })` → `{ state, dispatch, synced }`; `useRoomEvents({ gameKey, roomId, onEvent, enabled?, transport? })` → `{ send }`. Transport from `getRoomTransport(roomId)`; protocol in `RoomStatePeer` (`roomPeer.ts`, tested with `createMemoryTransport()` in `roomPeer.test.ts` — use the same pattern to test game reducers end to end without React; there is **no** React testing library in the repo).
- Party: `PartyGameType` in `logic/universalPartyManager.ts:31`; picker `components/PartyGamePickerModal.tsx`; routes `getGameRoute()` in `partyRoutes.ts`; title in `components/PartyActiveGameBanner.tsx:62` (nested ternary — replace with a small title map when adding games) and `PARTY_GAME_TITLES` in `components/PartyPendingGame.tsx`; back to lobby: `universalPartyManager.returnToLobby(roomId)` (host only), used by `KnisterRoomGame.tsx:66` — copy that pattern.
- Reference implementation of a room game: `src/games/knister/KnisterRoomGame.tsx` (+ its logic reducer).

## Decisions (maintainer, from the issue)

- D1 in-game share buttons become `InvitePlayersButton`; the games' own **live** invite flows go away.
- D2 Melodiq phones join the same lobby; mic audio stays WebRTC on top.
- D3 GuessArt and Storyteller keep their per-player links as a second option **"Play over days"** (labels via `t()`, de+en).
- D4 Gartic Phone moves to the room transport in this epic.
- D6 host-authoritative: guests send actions, host applies (`useRoomReducer`). No game invents its own sync.
- Non-goals: accounts, matchmaking, hosted backend, host-reload persistence.
- Orchestrator decision: **S11 (WebRTC as RoomTransport) is out of scope** here (optional, not in the epic's done-criteria) → follow-up issue.

## Rules for every slice

AGENTS.md §3–§6: logic pure in `logic/*.ts` with Vitest tests; new/changed `.tsx` ≤ 250 lines (split into `use<Feature>State.ts` + sub-components); no `any`; strings via `t()` in **de and en** in the game's existing string home; storage only via `src/lib/storage.ts` (register keys); no cross-game imports; no native dialogs. Per slice: one `changelog.d/647-<slug>.<added|changed|fixed|removed>.md` fragment. Narrowest checks after each step (`npx vitest run <dir>`, `npx eslint <files>`); `npx tsc -b` before each commit. **Commit after each slice** (Conventional Commit, `feat(<game>): … (#647 S<n>)`, end the message with the two trailer lines below). Never `--no-verify`. Do not push.

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L6uonSrNoWaJiNvg1NtKuH
```

## Slices (in this order)

### S6 — Gartic Phone on the room transport

- Files: `src/games/garticphone/hooks/useGarticSync.ts` (111), `hooks/useGarticGameState.ts` (195), `garticEngine.ts` (260) + `garticEngine.test.ts`, `GarticPhoneGame.tsx`.
- Today `useGarticSync` uses `useMultiChannelSync` **without mailbox** (same-device only). Replace with `useRoomReducer` (gameKey `garticphone`, state = the game state, host = party host) whose reducer handles actions `join`, `stepSubmit`, `forceEnd` (+ whatever the host currently does on `STATE_SYNC`). Make `GARTIC_STEP_SUBMIT` host-applied only (today it is not host-gated — open question, resolve by host-only).
- Pure reducer `garticRoomReducer(state, action)` in `garticEngine.ts` or a new `logic/` file, `authorize` = a player may only submit for themselves. Tests: host apply of submits/joins; end to end via `RoomStatePeer` + `createMemoryTransport` (host + 2 guests finish a round).
- Route opened directly with `?room=` (reload / late joiner) must work: guest sends hello, gets state.
- Players from `usePartyRoomPlayers`. "Back to lobby" for the host → `returnToLobby`.

### S10 — WebRTC heartbeat

- Pure timing module `src/lib/webrtc/heartbeat.ts` (+ `heartbeat.test.ts`, table style like `discoveryRetry.ts`): `PING_INTERVAL_MS = 5000`, `PEER_TIMEOUT_MS = 15000`; functions such as `isPeerStale(lastPongAt, now)` / `nextPingDue(...)`.
- Host (`WebRTCHostManager.ts`, `removePeer` at ~424): every 5 s send `{type:'ping', t}` on each data channel, track last `pong` per peer, `removePeer` after 15 s silence. Client (`useWebRTCClient.ts`): answer `ping` with `{type:'pong', t}`; 15 s without ping → treat as lost and use the existing reconnect path. Add the two message types where data-channel message types are declared; ignore them in game message handlers.
- Done: closing a phone tab removes it on the host in ≤ 16 s.

### S5 — GuessArt live in the lobby + "Play over days"

- `getGameRoute()` guessart → `/games/guessart?room=<room>` (update `partyRoutes.test.ts`).
- GuessArt reads `room` (via `parseGameUrlParams()` from `modules/sharing`, like Gartic): live mode runs on `useRoomReducer` (gameKey `guessart`) with the party roster; no name entry, no player links. Round logic needed by live mode goes into pure `logic/` (start from `logic/transitions.ts`, 217 lines; `useGuessArtGame.ts` is 321 lines — do not grow it, add a separate `useGuessArtRoom.ts` hook).
- The existing per-player flow (`SharePlayerLinksDialog`, `useGuessArtJoinLink`, MQTT `lgg/ga`) stays, reachable as **"Play over days"** in setup (`GameSetup.tsx` is 240 lines — extract a sub-component rather than grow it). In live mode the share entry becomes `InvitePlayersButton game="guessart"`.
- Tests: live reducer + `RoomStatePeer` round with 3 players; route test.

### S7 — Storyteller live in the lobby + "Play over days"

- Add `'storyteller'` to `PartyGameType`, `LAUNCHABLE_GAMES`, picker entry, titles, `getGameRoute()` → `/games/storyteller?room=<room>`.
- Live mode: turns follow `usePartyRoomPlayers` seat order, state via `useRoomReducer` (gameKey `storyteller`), pure reducer in `logic/` (engine `logic/engine.ts` `LocalStoryEngine` — reuse its pure parts). No push while live.
- Existing per-player links (`ShareStoryLinksDialog` from `StoryActiveView.tsx`, `useStoryJoinLink`, MQTT `lgg/storyteller/v1`, Web Push / ntfy) stay as **"Play over days"**; add the seat model + invited/joined status there (#467 slice 8) only if it fits in this slice without growing files over budget — otherwise note it in the Progress list as left open.
- `StoryWriterView.tsx` is 226 lines — do not grow it.

### S8 — Melodiq Notes pults join the party room

- Add `'melodiq-notes'` to `PartyGameType` / `LAUNCHABLE_GAMES` / picker / titles; `getGameRoute()` → `/games/melodiq-notes?pult=<room>` for guests and the stage route with `room=<room>` for the host (check `MelodiqNotesEntry.tsx:11-13` for how `pult`/`part` are read).
- The stage uses the **party room id** instead of `newRoomId()` (`pult/components/StageInvite.tsx:17`). Replace `StageInvite` by `InvitePlayersButton game="melodiq-notes"` + a small parts panel (who plays which part) reading `usePartyRoomPlayers`; each pult picks its part on its own device (stage pre-selection stays possible).
- Protocol `pult/logic/protocol.ts` unchanged apart from ids; keep clock sync and judging.

### S9 — Melodiq phones join the lobby

- Add `'melodiq'` to `PartyGameType` etc.; `getGameRoute()`: host → `/games/melodiq?room=<room>`, guests → `/games/melodiq?role=client&party=<room>`.
- `src/lib/webrtc/WebRTCHostContext.tsx` (231 lines — extract a helper instead of growing it): when Melodiq runs with `room`, use the party room code as `partyId` instead of the stored id.
- `PhoneClientEngine.tsx` (200): name and deviceId come from the party (`universalPartyManager.getMyPlayerId()`, `getOrCreatePlayerName()`), no separate profile prompt when in a room.
- QR codes in `MelodiqConnection.tsx` / `components/connection/DeviceConnection.tsx` / `gameplay/ScoreBoardQrCode.tsx` point to the lobby (`buildPartyShareUrl`); keep what `buildDeviceConnectionUrl()` (`components/connection/connectionUrl.ts:12`) does for trackers (localhost rewriting, custom tracker URLs in the link) — e.g. carry those params onto the lobby link and forward them from the lobby to the phone route.
- Remove the separate phone-party UI only once the lobby path works; if removal is risky, keep it behind the legacy path and say so in Progress. Mind Q4 (no new inline `BroadcastChannel`).

### S12 — Docs and harness

- Docs (front matter `verified` updated, one `docs/log.d/2026-11-07-one-lobby.md` fragment): `docs/tech/sync-protocol.md` (one lobby, `RoomTransport`, channel table incl. `garticphone_<room>`, `guessart_<room>`, `storyteller_<room>`, ping/pong), `docs/tech/game-catalog.md` §3, `docs/tech/webrtc-signaling.md` (party room as partyId, heartbeat), `docs/tech/architecture.md` §3.2 (`InvitePlayersButton`, `RoomTransport`, `usePartyRoomPlayers`). Grep every name before writing it.
- `scripts/e2e/webrtc-multiplayer.mjs` (Playwright via `require('playwright')`/import, local tracker `npm run tracker`, dev server `npm run dev`): scenarios from the issue (join N players, ping/pong, reload keeps slot, closed phone removed, reconnect, late joiner) plus lobby → game → lobby for each game; `npm run e2e:multiplayer` in `package.json`. Not in CI. Run it once locally with a small N (e.g. 3) and record the result in Progress.

## Acceptance criteria

- Every `PartyGameType` starts from the lobby with `?room=` and the host can return everyone to the lobby.
- `ShareSessionLinksDialog` is only used by the "Play over days" modes (`grep -rn ShareSessionLinksDialog src`).
- Melodiq phones join with the lobby QR.
- `npm run quality-gates` green; `npx tsc -b` clean.

## Progress

- [x] S1 pending launch (PR #649)
- [x] S2 InvitePlayersButton
- [x] S3 roster hook
- [x] S4 RoomTransport
- [x] S6 Gartic Phone — host reload still loses the round (non-goal); unused `GARTIC_*_PREFIX` storage keys left in storage.ts
- [x] S10 heartbeat — unit-tested timing only; the two-browser check comes with the S12 harness
- [x] S5 GuessArt — live mode has fixed catalogue word choice (no manual-word toggle) and no mid-game joins; setup text labels the links flow "Über Tage spielen"
- [x] S7 Storyteller — live story is in memory, default modifiers only; seat model + invited/joined status for "Play over days" (#467 slice 8) left open
- [x] S8 Melodiq Notes — pult guests have no back-to-lobby button; part pre-selection by the stage (`part=` link) is gone with the per-part links (`pultJoinUrl` kept, unused)
- [x] S9 Melodiq phones — standalone (hub) Melodiq keeps its stored party id and direct QR link as the legacy path; tracker params are forwarded from the lobby URL only while it still carries them; not verified with real phones (S12 harness)
- [ ] S12 docs + harness
- S11 out of scope → follow-up issue
