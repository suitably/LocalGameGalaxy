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
  at: 2026-10-21
  method: 'read src/modules/sync/*.ts, src/lib/webrtc/*, src/games/melodiq/{PhoneClientEngine.tsx,hooks/useTVMode.ts,hooks/useTVReceiver.ts,hooks/useMelodiqGlobalEvents.tsx}, public/sw-push.js, server/cloudflare-push-relay/worker.ts'
sources:
  - 'src/modules/sync/MqttMailboxService.ts'
  - 'src/modules/sync/useMultiChannelSync.ts'
  - 'src/lib/webrtc/'
  - 'server/cloudflare-push-relay/worker.ts'
---

# Cross-device synchronization protocol

Single home for message formats and transport rules. If you add a channel or message type, document it here in the same PR.

## 1. Channels at a glance

| Channel             | Used for                                                  | Transport                                                                   | Code                                                          |
| ------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| MQTT mailbox        | turn-based / room state across devices                    | public WSS MQTT brokers, QoS 1, retained                                    | `src/modules/sync/MqttMailboxService.ts`                      |
| Multi-channel sync  | same-device tabs **and** remote devices with one API      | `BroadcastChannel` + optional MQTT mailbox                                  | `src/modules/sync/useMultiChannelSync.ts`                     |
| WebRTC data channel | Melodiq host ↔ phones (pitch, session, proxied API calls) | `simple-peer`, signaled over WebTorrent trackers                            | `src/lib/webrtc/`, `src/games/melodiq/`                       |
| TV control          | Melodiq host ↔ TV window                                  | `BroadcastChannel('melodiq_tv_control')` or W3C Presentation API connection | `hooks/useTVMode.ts`, `hooks/useTVReceiver.ts`                |
| Web Push / ntfy     | wake background devices on turn change                    | Cloudflare Worker relay → Web Push and/or ntfy                              | `src/lib/push/pushClient.ts`, `server/cloudflare-push-relay/` |

Which game uses which channel: [game-catalog §3](game-catalog.md#3-sync-and-multi-device).

## 2. MQTT mailbox (`MqttMailboxService<T>`)

### Brokers and connection

- `DEFAULT_BROKER_URLS`: `wss://broker.hivemq.com:8884/mqtt`, then `wss://broker.emqx.io:8084/mqtt`. Override per instance via `brokerUrls`.
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

`channelId` is the game / room id chosen by the game.

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

- Published with `{ qos: 1, retain: true }` — the **last message per topic is retained by the broker** and delivered to late joiners.
- With `useCompression` (default `true`) the JSON is sent as `LZ:` + `LZString.compressToUTF16(...)`.
- Receive side drops: empty / `{}` messages, envelopes whose `channelId` does not match the topic, own echoes (`senderClientId === clientId`), and an exact repeat of the last processed payload per channel.
- Listeners: per channel (`subscribe(channelId, fn)` returns an unsubscribe) and global.

Public brokers: anyone who knows a topic can read and write it. Do not put secrets in payloads.

## 3. Multi-channel sync (`useMultiChannelSync<T>`)

```typescript
useMultiChannelSync<T>({
  channelId, // null/undefined = inactive
  broadcastPrefix, // BroadcastChannel name = `${broadcastPrefix}_${channelId}`
  mailbox, // optional MqttMailboxService<T>
  onMessage, // (payload, source: 'broadcast' | 'mqtt') => void
  enabled, // default true
}); // → { publish(payload, targetChannelId?) }
```

- `MultiChannelSyncCoordinator` opens the `BroadcastChannel` and MQTT subscription on start and closes both on stop/unmount; any option change restarts it.
- `publish` posts to a fresh `BroadcastChannel` for the target channel and, if a mailbox is set, publishes via MQTT. There is **no built-in ordering or conflict resolution** — games reconcile snapshots themselves. Tabletop (`logic/syncProtocol.ts`) is host-authoritative: other devices send actions as `INTENT`, the host (TV) applies them and broadcasts `STATE_DELTA` (changed widgets/fields from `logic/stateDelta.ts`) with a sequence number; a device that misses one, or just joined, requests a `STATE_SNAPSHOT`. Random results (shuffle, rolls) are decided on the host only. Private hands are redacted and sealed per seat ([tabletop-engine §5](tabletop-engine.md#private-hands)).
- Users: storyteller, tabletop, garticphone, party (the singleton `UniversalPartyManager` uses the class `MultiChannelSyncCoordinator`, channel `party_<room>`, broadcast prefix `galaxy`). Melodiq still opens `BroadcastChannel`s directly ([open-questions Q4](../open-questions.md#q4--melodiq-uses-inline-broadcastchannel)).
- Party roster merge (`src/features/party/logic/partyRoster.ts`): rosters are a union by player id; the copy with the newer `updatedAt` (join or rename) wins, so a stale state does not undo a rename. Leaving or being removed by the host writes `left[playerId] = time` into the room state (`removePlayer`); every merge drops a player whose departure is newer than their last join, and presence pings from before the departure are ignored. The host alone assigns `slot`s.

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

| Message                                                              | Direction                                          | Code                                                         |
| -------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------ |
| `session_sync`                                                       | host → phone                                       | `hooks/useMelodiqGlobalEvents.tsx` → `PhoneClientEngine.tsx` |
| `helper_config`                                                      | host → phone (companion URL/token for passthrough) | same                                                         |
| `game_state_update` `{state}`                                        | host → phone                                       | `PhoneClientEngine.tsx`                                      |
| `api_request` `{reqId, path, options}`                               | phone → host (phone uses host's library)           | `api/melodiqFetch.ts`                                        |
| `api_response` / `api_response_chunk` `{reqId, chunk, index, total}` | host → phone                                       | `PhoneClientEngine.tsx`                                      |
| `pitch` `{frequency, note, volume}`                                  | phone → host (`-1` = silence)                      | `PhoneClientEngine.tsx`                                      |
| `configure` `{config}`                                               | phone → host                                       | `useMelodiqGlobalEvents.tsx`                                 |

### 4.3 TV control (`melodiq_tv_control` / Presentation API)

| Message                                                                                                                        | Direction |
| ------------------------------------------------------------------------------------------------------------------------------ | --------- |
| `HOST_SESSION_INFO`, `PLAY_SONG`, `STOP_SONG`, `GAME_STATE`, `SETTINGS_UPDATE`, `REMOTE_COMMAND` (`WAIT_FOR_DOWNLOAD`), `PING` | host → TV |
| `TV_READY`, `PONG`, `SONG_ENDED`                                                                                               | TV → host |

Host-internal events (`PLAYBACK_STARTED`, `SONG_ENDED`, `TV_READY`) are also dispatched as DOM `CustomEvent`s (`melodiq_client_send_data` and friends) inside the host page.

## 5. Web Push and ntfy

- Client chooses `auto | webpush | ntfy | both` (`storage.getNotificationMethod()`); ntfy server default `https://ntfy.sh`, personal topic from `storage.getUserNtfyTopic()`.
- Relay endpoints (`server/cloudflare-push-relay/worker.ts`; each also under `/api/push/…`):

| Path                | Method | Purpose                                                                                                        |
| ------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| `/` or `/health`    | GET    | status, whether KV is bound                                                                                    |
| `/vapid-public-key` | GET    | VAPID public key (env `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`, else generated and stored in KV)                 |
| `/subscribe`        | POST   | store a push subscription                                                                                      |
| `/unsubscribe`      | POST   | remove it                                                                                                      |
| `/notify`           | POST   | `{gameId, senderPlayerId, title, body, url, action, targetPlayerId, ntfyTopic}` → fan-out to Web Push and ntfy |

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
| `STORAGE_KEYS.PUSH_RELAY_URL`, `NOTIFICATION_METHOD`, `NTFY_SERVER_URL`, `NTFY_TOPIC`                                             | notifications                          |
| `STORAGE_PREFIXES.GAME_RELAY` (`galaxy_game_relay_`)                                                                              | per-game relay URL from a share link   |
| `STORAGE_PREFIXES.PARTY_STATE`, `PARTY_HOST_ID`, `STORAGE_KEYS.PARTY_MY_PLAYER_ID`, `HOST_ROOM_CODE`                              | party room                             |

All keys: [persistence.md](persistence.md).
