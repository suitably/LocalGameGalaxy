---
type: Reference
title: 'Cross-device synchronization protocol'
description: 'How devices exchange state: MQTT mailbox (topics, envelope, compression, broker failover), useMultiChannelSync (BroadcastChannel + MQTT), Melodiq WebRTC data-channel and TV messages, Web Push / ntfy relay endpoints, and the storage keys involved.'
tags: [sync, mqtt, broadcastchannel, webrtc, webpush, ntfy, protocol]
status: stable
generated:
  at: 2026-10-18T15:00:00+02:00
  by: claude-code
verified:
  at: 2026-11-28
  method: 'read src/modules/sync/*.ts, src/lib/webrtc/*, src/games/melodiq/{PhoneClientEngine.tsx,hooks/usePhoneClientMessages.ts,hooks/usePhoneMicStreaming.ts,hooks/useTVMode.ts,hooks/useTVReceiver.ts,hooks/useMelodiqGlobalEvents.tsx}, public/sw-push.js, server/cloudflare-push-relay/worker.ts, cloudflare/webPushSend.ts, src/lib/push/siteWebPush.ts'
sources:
  - 'src/modules/sync/MqttMailboxService.ts'
  - 'src/modules/sync/useMultiChannelSync.ts'
  - 'src/lib/webrtc/'
  - 'server/cloudflare-push-relay/worker.ts'
---

# Cross-device synchronization protocol

Single home for message formats and transport rules. If you add a channel or message type, document it here in the same PR.

## 1. Channels at a glance

| Channel             | Used for                                                                            | Transport                                                                   | Code                                                          |
| ------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| MQTT mailbox        | turn-based / room state across devices                                              | public WSS MQTT brokers, QoS 1, retained                                    | `src/modules/sync/MqttMailboxService.ts`                      |
| Room transport      | one lobby for all multi-device games: host-run state and live events per party room | `BroadcastChannel` + MQTT `lgg/room` (`getRoomTransport(roomId)`)           | `src/modules/room-game/`                                      |
| Multi-channel sync  | same-device tabs **and** remote devices with one API                                | `BroadcastChannel` + optional MQTT mailbox                                  | `src/modules/sync/useMultiChannelSync.ts`                     |
| WebRTC data channel | Melodiq host ↔ phones (pitch, session, proxied API calls)                           | `simple-peer`, signaled over WebTorrent trackers                            | `src/lib/webrtc/`, `src/games/melodiq/`                       |
| TV control          | Melodiq host ↔ TV window                                                            | `BroadcastChannel('melodiq_tv_control')` or W3C Presentation API connection | `hooks/useTVMode.ts`, `hooks/useTVReceiver.ts`                |
| Web Push / ntfy     | wake background devices on turn change                                              | Cloudflare Worker relay → Web Push and/or ntfy                              | `src/lib/push/pushClient.ts`, `server/cloudflare-push-relay/` |

Which game uses which channel: [game-catalog §3](game-catalog.md#3-sync-and-multi-device).

## 2. MQTT mailbox (`MqttMailboxService<T>`)

### Brokers and connection

- `DEFAULT_BROKER_URLS`: `wss://broker.hivemq.com:8884/mqtt`, then `wss://test.mosquitto.org:8081` (EU fallback since #645, replaced `broker.emqx.io`). Override per instance via `brokerUrls`.
- One lazily created client per service instance; client id `<clientPrefix|lgg_sync>_<random>_<timestamp>`.
- `reconnectPeriod` 5 s (fixed, no exponential backoff), `keepalive` 60 s, `connectTimeout` 10 s. On `error` the service rotates to the next broker URL.
- On (re)connect it re-subscribes every channel in `subscribedChannels`.

### Topics

Topic = `<topicPrefix>/<channelId>`. Prefixes in use:

| Prefix               | Instance                                        |
| -------------------- | ----------------------------------------------- |
| `lgg/ga`             | `src/games/guessart/logic/guessArtMailbox.ts`   |
| `lgg/storyteller/v1` | `src/games/storyteller/logic/mailboxService.ts` |
| `lgg/tabletop`       | `src/games/tabletop/hooks/useTabletopSync.ts`   |
| `lgg/party`          | `src/features/party/logic/partyMailbox.ts`      |
| `lgg/room`           | `src/modules/room-game/roomTransport.ts`        |

`channelId` is the game / room id chosen by the game. On `lgg/room`, `useRoomReducer` uses `<gameKey>_<roomId>` (host-run state) and `useRoomEvents` uses `<gameKey>_<roomId>_live` (fire-and-forget events, e.g. Melodiq Notes pult input and clock pings). Only last-state messages are retained (see the `retain` table below); a receiver of live events must still ignore stale ones (a retained message from before #662 can linger on a topic).

### Envelope

```typescript
// src/modules/sync/MqttMailboxService.ts
export interface MqttEnvelope<T> {
  version: number;
  channelId: string;
  senderClientId: string;
  timestamp: number;
  payload: T;
}
```

- Published with `qos: 1`; `retain` per mailbox option `retain(payload)` (default `false`). Only the last state a late joiner needs is retained (#662, [ADR 0009](../adr/0009-mqtt-end-to-end-encryption.md)):

  | Mailbox              | Retained                               | Not retained                            |
  | -------------------- | -------------------------------------- | --------------------------------------- |
  | `lgg/party`          | room state (`PartyRoomState`)          | `PARTY_PRESENCE` pings                  |
  | `lgg/room`           | `{kind: 'state'}`                      | `hello`, `action`, every `_live` event  |
  | `lgg/ga`             | game snapshot (short QR links load it) | —                                       |
  | `lgg/storyteller/v1` | `STORY_SYNC` / `STORY_FINISH` snapshot | —                                       |
  | `lgg/tabletop`       | —                                      | everything (a seat asks for a snapshot) |

- **End-to-end encryption (#662, [ADR 0009](../adr/0009-mqtt-end-to-end-encryption.md)).** A channel with a room key (option `keyFor(channelId)`, default `getRoomKey(channelId)` from `src/modules/sync/roomKeys.ts`) is sent as the JSON envelope `{"v":1,"iv":"<base64, 12 bytes>","ct":"<base64 AES-GCM-256 ciphertext + tag>"}` (`src/modules/sync/roomCrypto.ts`). The plaintext inside is exactly the unencrypted wire string (envelope JSON or `LZ:`…), so compression happens before encryption. Receive side: a keyed channel drops plaintext and anything that fails to decrypt; a channel without a key drops encrypted messages and fires `onLockedChannel(channelId)` (the party lobby shows `PartyEncryptedRoomNotice`). Publishes are encrypted in order (`sealQueue`). Keys per mailbox: `lgg/party` channel `party_<room>` → key of `<room>`; `lgg/room` → key of the room passed to `getRoomTransport(roomId)` (each channel used through it is bound to that room); `lgg/tabletop` channel = room code; `lgg/ga` and `lgg/storyteller/v1` channel = game id.
- **Room keys** (`roomKeys.ts`): 256-bit, base64url (43 characters). The party host creates one in `createParty` (`ensureRoomKey(room, 'session')`, session storage); a "Play over days" GuessArt / Storyteller game gets one at creation or when it is shared (`ensureRoomKey(gameId, 'local')`, local storage, the game spans days). The key travels only in the link fragment as `key=`: lobby invite `#/party?room=<CODE>&key=<KEY>` (`buildPartyShareUrl`, Gartic Phone share dialog, `buildDeviceConnectionUrl` lobby links), player links `#<route>?gameId=…&player=…[&data=…][&gameRelay=…]&key=<KEY>` (`buildSessionLink`). `captureInviteKey()` stores it (lobby controller, `useGameJoinUrl`); it reads `key` only from the fragment (also a bare `#key=` after a path query, e.g. `/party?room=X#key=K`), never from the query string. Push / ntfy deep links (`buildGameDeepLink`) carry no key: the device already has it. A room whose link has no key (old link, old host) stays plaintext for one release; a device that types the room code of an encrypted room hears nothing and gets the hint to use the invite link or QR code.
- **Player join links** (`src/modules/sharing/sessionLink.ts`, `useSessionSharing`): the copied / shared link is `#<route>?gameId=…&player=…&data=<LZ snapshot>[&gameRelay=…]` and works without a broker. The QR code uses the same link without `data` once it exceeds `QR_LINK_MAX_LENGTH` (a full snapshot does not fit a scannable QR code); pass it as `buildQrLink`. GuessArt then loads the game from the retained mailbox snapshot (`importFromMailbox` in `src/games/guessart/logic/joinFromMailbox.ts`, 15 s timeout, notice `JoinLinkNotice`). Storyteller does not pass `buildQrLink` yet: its QR code keeps the full link, and the dialog shows a hint instead of a QR code when the link exceeds the QR capacity.
- With `useCompression` (default `true`) the JSON is sent as `LZ:` + `LZString.compressToUTF16(...)`.
- Receive side drops: empty / `{}` messages, envelopes whose `channelId` does not match the topic, own echoes (`senderClientId === clientId`), and an exact repeat of the last processed payload per channel.
- Listeners: per channel (`subscribe(channelId, fn)` returns an unsubscribe) and global.

Public brokers: anyone who knows a topic can read and write it. With a room key they see only ciphertext, topic names (room code / game id) and timing; legacy rooms without a key are still readable.

## 3. Multi-channel sync (`useMultiChannelSync<T>`)

```typescript
useMultiChannelSync<T>({
  channelId, // null/undefined = inactive
  broadcastPrefix, // BroadcastChannel name = `${broadcastPrefix}_${channelId}`
  mailbox, // optional MqttMailboxService<T>
  onMessage, // (payload, source: 'broadcast' | 'mqtt') => void
  enabled, // default true; false = no listener, publish still sends
  selfEcho, // default true; false = publish via the open listening channel, no own echo
}); // → { publish(payload, targetChannelId?) }
```

- `MultiChannelSyncCoordinator` opens the `BroadcastChannel` and MQTT subscription on start and closes both on stop/unmount; any option change restarts it.
- `publish` posts to a fresh `BroadcastChannel` for the target channel (so the instance's own listener hears it too) and, if a mailbox is set, publishes via MQTT. With `selfEcho: false`, publishes to the instance's own channel go through its open listening channel instead: no own echo, no channel per message (high-frequency streams such as Melodiq `GAME_STATE`); while no listening channel is open, or for another target, a fresh one is used. There is **no built-in ordering or conflict resolution** — games reconcile snapshots themselves. Tabletop (`logic/syncProtocol.ts`) is host-authoritative: other devices send actions as `INTENT`, the host (TV) applies them and broadcasts `STATE_DELTA` (changed widgets/fields from `logic/stateDelta.ts`) with a sequence number; a device that misses one, or just joined, requests a `STATE_SNAPSHOT`. Random results (shuffle, rolls) are decided on the host only. Private hands are redacted and sealed per seat ([tabletop-engine §5](tabletop-engine.md#private-hands)).
- Users: storyteller, tabletop, garticphone, party (the singleton `UniversalPartyManager` uses the class `MultiChannelSyncCoordinator`, channel `party_<room>`, broadcast prefix `galaxy`). Melodiq (same-device only, `selfEcho: false`, constants in `src/games/melodiq/logic/syncChannels.ts`): TV control `melodiq_tv` + `control` = `melodiq_tv_control` (`useTVMode`, `useTVReceiver`, `SettingsContext`, publish-only `useSessionEnd`) and host queue `melodiq_queue` + `channel` = `melodiq_queue_channel` (`useQueue`).
- **One lobby (#647):** every multi-device game starts from the party lobby (`/party`); the host picks a game, every device follows to `<route>?room=<CODE>`. The host ends a game with "End game" (lobby banner `PartyActiveGameBanner`, or a game's own end control; `universalPartyManager.returnToLobby`, party `status` → `lobby`). **Lobby during a game (#657):** in the room games (Gartic Phone, GuessArt, Storyteller, Knister) "back to lobby" only opens the lobby, for the host as for guests; the game goes on, because `useRoomReducer` keeps its `RoomStatePeer` after the page closes (`roomPeerRegistry.ts`, `keepAlive`, default on) — the host's peer keeps applying guests' actions. The party manager calls `releaseRoomPeers(roomId)` whenever `statusAt` changes (a launch or a return), so a new game starts fresh; `useRoomReducer` returns `rev` (0 = fresh) so a host that comes back does not deal again. The lobby does not send a visiting guest back into the game it came from (`visitedGameAt`, `shouldFollowIntoGame` in `logic/lobbyReturn.ts`), only into a newly started one; a device that opens the lobby without a running game in memory (invite link, reload) joins the running game. Renames and the watch switch apply from the next game (games copy their players at the start). Melodiq, Melodiq Notes and tabletop still end the game when the host leaves it; every guest's game mounts `useFollowPartyLobby(roomId)` (`src/features/party/hooks/`) and opens `/party?room=<CODE>` on that change, or at once when its page opens after the game already ended (`shouldFollowToLobby` in `logic/lobbyReturn.ts`). `launchGame`/`returnToLobby` stamp `statusAt`; in a merge the newer `statusAt` keeps `status`/`activeGame`, so a late copy of an older state cannot bounce a device back into a finished game. Games do not navigate guests themselves (a game-state "ended" redirect races the party status and bounces the guest back into the game). Multi-browser check: `npm run e2e:multiplayer` (`MQTT_RELAY=ws://localhost:<port>` routes the app's broker WebSockets to a local MQTT-over-WebSocket broker). **Watching (#658, #659):** every device, the host included, can switch to watching in the lobby (`setSpectator`); a watching host still runs the room and the game. A device that is not among a game's players gets a spectator view with one chip per player (`components/games/SpectatorPlayerPicker`, `hooks/useSpectatorSelection`) and follows that player from the room state: Gartic Phone the step they answer and their sent answer (`logic/spectatorView.ts`), Knister their sheet, GuessArt the drawer's view with the word or the guesser's view, Storyteller their sent lines. Unsent drafts (typing, strokes) are not in the room state and do not show. The roster is `usePartyRoomPlayers(roomId)` (`{id, name, seat, isHost}`); in-game "invite" buttons are `InvitePlayersButton` (`/party?[room=…&]launch=<game>`). Room-transport channels `<gameKey>_<room>`: `knister_<room>`, `garticphone_<room>` (actions `join`, `stepSubmit`, `reveal`, `restart`, `forceEnd`; a player submits only for themselves), `guessart_<room>` (`start`, `selectWord`, `submitDrawing`, `guess`, `hint`; only the drawer/guesser whose turn it is), `storyteller_<room>` (`start`, `submit`, `finish`), `melodiq-notes-pult_<room>` (stage ↔ pult). Melodiq (TV + phones) is not on the room transport: the lobby's room code is the WebRTC party code. GuessArt and Storyteller keep their per-player links and MQTT mailboxes as the "Play over days" mode (no `?room=`). Not covered: a host reload (state lives in memory), WebRTC as a `RoomTransport` (follow-up).
- Games played in a party room (`src/modules/room-game`, first user Knister): messages `{kind: 'hello'|'action'|'state', from, …}` on channel `<game>_<room>`. The host (party host) applies a guest's action with the game's reducer if the game's `authorize` allows it (e.g. only on the sender's own sheet) and publishes `{kind: 'state', rev, state}`; guests keep the state with the highest `rev` and send `hello` every 2 s until the first state arrives. The state lives in memory on the host. **Host change (`roomSnapshot.ts`):** a device that becomes host continues from the newest copy it knows (`resumeFrom`: its kept guest peer's state, taken out of the registry with `takeRoomPeer`, or a snapshot), so the game is not dealt again; with `resumeTag` (the party's `statusAt`, set in a Stammtisch by `usePartyRoomGame`) every device stores each state it sees under `STORAGE_PREFIXES.ROOM_GAME_SNAPSHOT + roomId` and a snapshot is used only for the same channel and tag, so a match resumes even after all devices were closed. `adoptState` rewrites the resumed state for the new host (`hostId`). The dice games' room page follows a host change live (`usePartyRoomPlayers(roomId, { liveHost: true })`); other room games keep the role their page opened with and resume from the guest copy when the new host reopens the game. Sealed games (`SealedRoomPeer`) do not resume: guests only hold their own view. The dice games share the room hook `usePartyRoomGame` (`features/party/hooks`): Knister (`knister_<room>`, `KnisterRoomAction`), Kniffel (`kniffel_<room>`, `KniffelRoomAction`: only the player whose turn it is rolls, holds and scores; the host picks `rules` — `kniffel` or `international`: further five of a kinds 100 and jokers for Full House and straights — at `START` or with `RULES` before the first score or after the game) and Qwixx (`qwixx_<room>`, `QwixxRoomAction`: the roller rolls, everyone sends `DONE` per roll and `REPORT`s the summary of their own sheet, which stays on the device).
- Melodiq Notes stage ↔ pult (`src/games/melodiq-notes/pult/logic/protocol.ts`, #573/#546): room state `PultRoomState` (`hostId`, `song` = `{key, title, parts}`, `play`, `members`) via `useRoomReducer`, game key `melodiq-notes-pult`; a pult `JOIN`s / `LEAVE`s only as itself, the stage may also remove one. Live events (`PultEvent`, `useRoomEvents`): `ping`/`pong` (clock offset, `pult/logic/clockSync.ts`); `clock` — the stage's transport (`songKey`, stage time `at`, `beat`, `rate` in beats/s, 0 while the beat stands, `play`, `mode`, `loop`) on every engine change and every 2 s; `chart-request` → `chart` (`PackedChart`: the song timeline plus one part, notes as `[t, dur, pitch, syl?, drum?, hand?]` tuples, `pult/logic/pultSong.ts`); `judged` — a pult's judgements since its last batch (`[noteId, judgement]` in `buildChart` order) with its totals and a growing `seq`, every 150 ms; `input` — what was played (lane or voice), display only; `click-request` → `click-plan` — tap-along calibration: the stage schedules 12 clicks on its audio clock and names their stage times (`performance.now()` on the stage), the pult matches the player's taps (`src/modules/audio/latency/tapAlong.ts`). The pult judges (`pult/PultEngine.ts`): it runs its part `inputLatencyMs` behind the stage clock (calibrated per input source: how late the player hears the stage plus how late their input arrives), so notes cross the line when heard and input is judged against that; the stage only merges (`stage/engine/remote.ts`). Network jitter does not enter the judging, only the clock offset (`clockSync.ts`: 16 samples, median of the 4 shortest round trips; frames follow the target smoothly). Learn mode is for one player; if that player is on a pult, the stage waits until the pult's `learn` judgement arrives (batches every 60 ms). Stale messages carry an old `songKey` (or a lower `seq`) and are ignored.
- Party roster merge (`src/features/party/logic/partyRoster.ts`): rosters are a union by player id; the copy with the newer `updatedAt` (join or rename) wins, so a stale state does not undo a rename. Leaving or being removed by the host writes `left[playerId] = time` into the room state (`removePlayer`); every merge drops a player whose departure is newer than their last join, and presence pings from before the departure are ignored. The host alone assigns `slot`s. Session rules (create/join state, host takeover) are pure in `src/features/party/logic/partySession.ts`; `UniversalPartyManager` is the adapter (storage, timers, transport). **Host takeover (#467 S2):** every device sends `PARTY_PRESENCE` every 3 s; when the host has not pinged for `HOST_TIMEOUT_MS` (20 s) or is no longer in the roster, the live player with the lowest seat (spectators only if nobody else) becomes host and raises `hostEpoch`. In a merge the higher `hostEpoch` wins over everything, including a device's own creator claim, so a returning old host steps down (its `PARTY_HOST_ID` session key is removed). No takeover while the host is still unknown (`hostId` empty), and none for a silent host unless this device still hears another player who kept pinging more than `HEARING_GAP_MS` after the host's last ping: a phone whose network drops (Wi-Fi to mobile data) hears nobody and must not make itself host, so in a room of only host and one guest a silent host is never replaced (one that left the roster is). Silence during this device's own outage does not count either: after more than `HEARING_GAP_MS` (8 s) without any presence ping, every player counts as seen at the moment the room is heard again (`hearingSince`), so a reconnecting phone that hears another guest before the host's next ping does not take over. A game already running keeps its in-memory host role until the room returns to the lobby: `usePartyRoomPlayers` fixes `isHost` when the game page opens. Harness: `npm run e2e:multiplayer` with `MQTT_RELAY` also cuts a guest off for 30 s and checks that the host stays.
- **Stammtisch (saved party room, [tasks/STAMMTISCH.md](../tasks/STAMMTISCH.md)):** `PartyRoomState.stammtisch` holds the room's name once a member saves it (`universalPartyManager.markStammtisch`); a merge keeps it when a copy without it arrives. Members save `{roomId, roomKey, name, playerId}` locally (`features/party/logic/stammtisch.ts`) and re-enter with the same player id (`adoptPlayerId`), so the roster keeps one entry per member across days. In a Stammtisch the host-takeover guard for a lone device is off (being alone is normal there), any member may take over hosting from the lobby (`claimHost`, raises `hostEpoch`), and `roomPlayersOf` lists only members heard within `AWAY_AFTER_MS` (15 s, `universalPartyManager.isPresent`), so absent members are not dealt into a game; the lobby shows them as away. The room code cannot be changed in a Stammtisch.
- **Playing for another player ([tasks/STAMMTISCH.md](../tasks/STAMMTISCH.md) slice 3):** a player allows it on their own device (lobby switch, `universalPartyManager.setHelpers`), which writes `PartyPlayer.helpers = 'all'` into their roster entry (merged like a rename; presence pings carry it). `usePartyRoomGame` wraps the game's `authorize` with `withHelp` (`features/party/logic/partyHelp.ts`): the host accepts an action when the game allows it for the sender or for a player the sender may help (`mayHelp`). Turn-based games pass `actorOf(state)`; the hook returns `canAct` and `actingFor`, and every action a helper sends for someone else is announced on the live channel `party-help_<room>_live` (`useRoomEvents`, `{type: 'helped', by, for, at}`), which `PartyHelpNotice` shows on the helped device (events older than 10 s are ignored). `dispatchFor(playerId, action)` announces an action done for a given player and `helpable` lists the players this device may help. Kniffel: the helper plays the helped player's turn. Knister: `PartySheetPicker` switches between the own sheet and a helped player's sheet (`PLACE` for them). Qwixx: the helper may roll for a helped roller; ticking their sheet is not possible, because a Qwixx sheet lives only on its owner's device.
- **"Tap here" markers (slice 4):** `RoomMarkers` (`features/party/components`) puts a "Show" button into the header (`setCustomHeaderActions`); in pointing mode a transparent layer catches the next tap and picks the smallest element marked `data-room-target="<game>.<id>"` under it by rectangle (disabled controls ignore the pointer). It sends `{type: 'marker', to, target, by, at}` on the live channel `party-marker_<room>_live` (`useRoomEvents`); `to` is the player whose turn it is or `'all'`. The receiving device (and the sender) draws a pulsing ring around the element and scrolls it into view; tapping it sends `{type: 'clear', to: <sender>}`; it expires after 15 s; events older than 30 s are ignored (`logic/roomMarkers.ts`). No help grant is needed. Targets: Kniffel `kniffel.die.<0-4>`, `kniffel.roll`, `kniffel.score.<category>.<player index>`; Knister `knister.roll`, `knister.cell.<row>.<col>`; Qwixx `qwixx.roll`, `qwixx.done`, `qwixx.cell.<row id>.<number>`.

## 4. Melodiq WebRTC and TV messages

`MelodiqNetworkMessage` (`src/games/melodiq/types.ts`) has `type: string` plus loose optional fields — the vocabulary below is **derived from the code**, not from a typed union.

### 4.1 Signaling handshake (tracker peer, `src/lib/webrtc/`)

Details and sequence diagram: [webrtc-signaling.md](webrtc-signaling.md).

| Message                                                    | Direction    | Purpose                                               |
| ---------------------------------------------------------- | ------------ | ----------------------------------------------------- |
| `host_hello` `{partyId}`                                   | host → phone | host announces itself on a tracker peer               |
| `client_probe`                                             | phone → host | phone checks whether a tracker peer is the right host |
| `{connectionId, signal}` (signal `offer` / `answer` / ICE) | both         | wrapped SDP exchange for the data peer                |
| `identify` `{connectionId, profile…}`                      | phone → host | binds the data peer to a device/profile               |

### 4.2 Data channel (host ↔ phone)

| Message                                                              | Direction                                                                                                          | Code                                                                                               |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `session_sync`                                                       | host → phone                                                                                                       | `hooks/useMelodiqGlobalEvents.tsx` → `hooks/usePhoneClientMessages.ts`                             |
| `helper_config`                                                      | host → phone (companion URL/token for passthrough)                                                                 | same                                                                                               |
| `helper_config.get`                                                  | phone → host (asks for `helper_config` on connect)                                                                 | `PhoneClientEngine.tsx` → `components/PhoneQueueBridge.tsx`                                        |
| `room` `{channel, msg}`                                              | both (room API envelope; queue, settings, feedback)                                                                | `src/modules/room-game/peerTransport.ts`, [melodiq-architecture.md](melodiq-architecture.md) §2.13 |
| `game_state_update` `{state}`                                        | host → phone                                                                                                       | `hooks/usePhoneClientMessages.ts`                                                                  |
| `api_request` `{reqId, path, options}`                               | phone → host (phone uses host's library)                                                                           | `api/melodiqFetch.ts`                                                                              |
| `api_response` / `api_response_chunk` `{reqId, chunk, index, total}` | host → phone                                                                                                       | `hooks/usePhoneClientMessages.ts`                                                                  |
| `pitch` `{seq, frames: [{dt, note, frequency, volume}]}`             | phone → host (voiced frames, `note: -1` = stopped; the old single-frame `{frequency, note, volume}` is still read) | `hooks/usePhoneMicStreaming.ts`                                                                    |
| `ping` `{t}` / `pong` `{t}`                                          | host → phone every 5 s / phone → host                                                                              | `src/lib/webrtc/heartbeat.ts`, `WebRTCHostManager.ts`, `useWebRTCClient.ts`                        |

### 4.3 TV control (`melodiq_tv_control` / Presentation API)

| Message                                                                                                                                           | Direction |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `HOST_SESSION_INFO`, `PLAY_SONG`, `STOP_SONG`, `GAME_STATE`, `SETTINGS_UPDATE`, `REMOTE_COMMAND` (`WAIT_FOR_DOWNLOAD`), `SESSION_RESULTS`, `PING` | host → TV |
| `TV_READY`, `PONG`, `SONG_ENDED`                                                                                                                  | TV → host |

`GAME_STATE` carries the host's results flags with every report (`hooks/usePlaybackReporting.ts`): `isFinished` (song over) and `isPausedForScore` ("next" during a song paused it for the scoreboard), so the TV and the phones switch to the scoreboard with the host.

`SESSION_RESULTS` `{songId, results}` carries the host's scoreboard of the song that just ended (score, new-record flag, best 50 history entries per singer; `logic/tvSessionResults.ts`). The host session fires it as the DOM event `melodiq_session_results` once finished with a TV connected, again whenever a row changes (a phone singer's history arrives later); `useTVMode` forwards it. The TV shows these rows on its scoreboard and falls back to the live scores from `GAME_STATE`; `PLAY_SONG` and `STOP_SONG` clear them.

Host-internal events (`PLAYBACK_STARTED`, `SONG_ENDED`, `TV_READY`) are also dispatched as DOM `CustomEvent`s (`melodiq_client_send_data` and friends) inside the host page.

## 5. Web Push and ntfy

- Client chooses `auto | webpush | ntfy | both` (`storage.getNotificationMethod()`); ntfy server default `https://ntfy.sh`, personal topic from `storage.getUserNtfyTopic()`.
- **Site Web Push (default, no relay):** the app worker sends Web Push itself (`cloudflare/webPushSend.ts`): `GET /api/push/vapid-public-key` → `{publicKey}`, `POST /api/push/send` `{subscription, title, body, url?, tag?, icon?}` → one encrypted push (RFC 8291/8292). Nothing is stored: a device that has notification permission subscribes (`src/lib/push/siteWebPush.ts`, `ensureSiteWebPush`; key `STORAGE_KEYS.PUSH_SITE_SUBSCRIPTION`), the subscription travels as `webPush` on the players seated on that device (`PlayerChannels`, `getDeviceChannels`), and the moving device passes it with the turn message (`pushClient.sendGamePushNotification`). Only push-service endpoints (FCM, Mozilla, Windows, Apple) are accepted, text is limited to 300 characters and the click URL must be on the same site. When the site push arrives, ntfy is skipped unless the target chose `both`; a 410 (subscription gone) or any failure falls back to ntfy. iOS offers push only to the home-screen app (`needsHomeScreenInstall`, hint in `PushNotificationBanner`).
- Relay endpoints (`server/cloudflare-push-relay/worker.ts`; each also under `/api/push/…`):

| Path                | Method | Purpose                                                                                                                           |
| ------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `/` or `/health`    | GET    | status, whether KV is bound                                                                                                       |
| `/vapid-public-key` | GET    | VAPID public key (secrets `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`, else generated once and stored in KV; neither → 503, ntfy only) |
| `/subscribe`        | POST   | store a push subscription                                                                                                         |
| `/unsubscribe`      | POST   | remove it                                                                                                                         |
| `/notify`           | POST   | `{gameId, senderPlayerId, title, body, url, action, targetPlayerId, ntfyTopic}` → fan-out to Web Push and ntfy                    |

- Subscriptions live in KV binding `PUSH_KV` if configured — the binding is **commented out** in `wrangler.toml`, so without dashboard configuration the relay uses in-memory storage that is lost on cold start.
- Who is told about a turn: `src/lib/notifications/turnDelivery.ts` — `deliveryAfterOwnMove` (push the next player's device, notify here, or nothing) and `deliveryForIncomingMove` (notify on the receiving device). Pure; GuessArt (`logic/turnPush.ts`, `logic/notificationService.ts`) and Storyteller (`logic/storyTurnNotify.ts`) use it. Both games' `importSnapshot` take game content from the newer snapshot and each player's seat and channels from whichever side changed the seat last (`mergeSnapshotPlayers`), so an old link payload cannot undo a join.
- Service worker `public/sw-push.js`: payload `{title, body, icon, tag, url}`; defaults title `LocalGameGalaxy`, body `Du bist an der Reihe!`, tag `lgg-game-turn`; click opens/focuses `url`.

## 6. Storage keys involved

| Key                                                                                                                               | Purpose                                |
| --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `STORAGE_KEYS.ACTIVE_SESSION` (`melodiq_active_session`)                                                                          | Melodiq session across reloads         |
| `STORAGE_KEYS.MELODIQ_PARTY_ID`, `STORAGE_PREFIXES.WEBRTC_PARTY_ID`                                                               | WebRTC party / info-hash id            |
| `STORAGE_KEYS.MELODIQ_TRACKER_URLS`, `MELODIQ_DISABLED_TRACKER_URLS`, `MELODIQ_TRACKER_PREFERENCES`, prefix `WEBRTC_TRACKER_PREF` | tracker list and per-tracker overrides |
| `STORAGE_KEYS.SIGNALING_URL`                                                                                                      | explicit self-hosted tracker URL       |
| `STORAGE_KEYS.PUSH_RELAY_URL`, `PUSH_SITE_SUBSCRIPTION`, `NOTIFICATION_METHOD`, `NTFY_SERVER_URL`, `NTFY_TOPIC`                   | notifications                          |
| `STORAGE_PREFIXES.GAME_RELAY` (`galaxy_game_relay_`)                                                                              | per-game relay URL from a share link   |
| `STORAGE_PREFIXES.PARTY_STATE`, `PARTY_HOST_ID`, `STORAGE_KEYS.PARTY_MY_PLAYER_ID`, `HOST_ROOM_CODE`, `STAMMTISCH_*`              | party room                             |
| `STORAGE_PREFIXES.ROOM_KEY` (`galaxy_room_key_`)                                                                                  | MQTT end-to-end key (room / game id)   |

All keys: [persistence.md](persistence.md).
