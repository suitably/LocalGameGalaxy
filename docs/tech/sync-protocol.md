---
type: Technical Specification
title: Cross-Device Synchronization Protocol
description: Single Source of Truth for cross-device synchronization protocols, MQTT mailboxes, WebRTC DataChannels, and BroadcastChannels.
resource: src/modules/sync/
tags: [sync, webrtc, mqtt, broadcastchannel, protocol, webpush]
status: stable
generated: { by: antigravity/2.0, at: 2026-09-27T10:00:00Z }
verified: { by: process:ci, at: 2026-09-27T10:00:00Z }
sources:
  - id: sync-module
    resource: src/modules/sync/MqttMailboxService.ts
    title: Generic MQTT Mailbox Service
  - id: multichannel-sync
    resource: src/modules/sync/useMultiChannelSync.ts
    title: Multi-Channel Synchronization Hook
---

# Cross-Device Synchronization Protocol

> [!IMPORTANT]
> This document is the Single Source of Truth for all message schemas, synchronization protocols, and peer-to-peer communication mechanisms used across LocalGameGalaxy.

---

## 1. Communication Channels Overview

LocalGameGalaxy utilizes four distinct communication and synchronization mechanisms depending on the topology, latency requirements, and physical deployment:

| Channel | Used For | Technology & Transport | Module Path |
|---------|----------|------------------------|-------------|
| **MQTT Mailbox Service** | Asynchronous turn-based game progression & room presence | Public WSS MQTT Brokers (`hivemq`, `emqx`) with LZString compression | `src/modules/sync/MqttMailboxService.ts` |
| **Multi-Channel Sync Coordinator** | Unified local + remote peer synchronization with fallback | `BroadcastChannel` + `MqttMailboxService` | `src/modules/sync/useMultiChannelSync.ts` |
| **WebRTC DataChannel** | Low-latency real-time pitch streaming & controller input | `simple-peer` over WebSocket BitTorrent signaling tracker | `src/modules/sync/`, `src/games/melodiq/` |
| **Web Push & ntfy Relays** | Mobile background wake-up and turn notifications | RFC 8291 Web Push & ntfy HTTP POST via Cloudflare Worker | `src/lib/push/pushClient.ts` |
| **Presentation API & Local BC** | TV mode presentation on secondary displays / local browser tabs | W3C Presentation API & `BroadcastChannel('melodiq_tv_control')` | `src/games/melodiq/` |

---

## 2. MQTT Mailbox Service (`MqttMailboxService<T>`)

The `MqttMailboxService` provides a decentralized, serverless mailbox pattern for turn-based state exchange.

### Architecture & Broker Fallback
- Connects over WebSockets (`wss://`) to resilient public brokers:
  - Primary: `wss://broker.hivemq.com:8884/mqtt`
  - Fallback: `wss://broker.emqx.io:8084/mqtt`
- Automatically retries connection with exponential backoff on network flaps.
- Compresses large game snapshots using `lz-string` to minimize bandwidth and fit within broker packet quotas.

### Topic Namespace Pattern
```
localgamegalaxy/<gameId>/<sessionId>/state
localgamegalaxy/<gameId>/<sessionId>/presence
```

### Snapshot Payload Structure
```typescript
interface MailboxMessage<T> {
  senderId: string;
  timestamp: number;
  payload: T;
}
```

Games consuming `MqttMailboxService`:
- **GuessArt**: Synchronizes drawings, active turn tokens, and round guessing evaluations.
- **Storyteller**: Exchanges story segments, turn countdown tokens, and story completion snapshots.
- **Tabletop Engine**: Reconciles board and player card hand state snapshots.
- **Universal Party**: Broadcasts room lobby metadata and launches synchronized game instances.

---

## 3. Multi-Channel Synchronization (`useMultiChannelSync<T>`)

The `useMultiChannelSync` custom hook and `MultiChannelSyncCoordinator` combine local `BroadcastChannel` (for instant zero-latency same-device tabs) and remote MQTT (for multi-device connectivity).

### Synchronization Flow
1. **Local Emission**: State changes are published immediately to the local `BroadcastChannel`.
2. **Remote Emission**: Concurrently published to the active MQTT topic.
3. **Reconciliation**: Incoming snapshots are deduplicated by timestamp/turn counter so local broadcasts take precedence without duplicate reducer processing.
4. **Lifecycle Safety**: Automatically tears down MQTT client subscriptions and closes `BroadcastChannel` instances on component unmount, preventing memory and socket leaks.

---

## 4. WebRTC DataChannel (Host ↔ Phone Microphones)

Phone clients and the Host exchange JSON-serialized messages over WebRTC DataChannels for Melodiq karaoke pitch streaming.

```typescript
interface PeerMessage {
  type: PeerMessageType;
  payload?: unknown;
}
```

### Host → Phone Messages

| Type | Description | Payload |
|------|-------------|---------|
| `TRACKER_SIGNAL` | Forwards BitTorrent tracker signal data during handshake | `{ signal: SimplePeerSignalData }` |
| `QUEUE_UPDATE` | Syncs current song queue to phone | `{ queue: QueueItem[] }` |
| `GAME_STARTED` | Notifies phone that a song started | `{ songTitle: string }` |
| `GAME_STOPPED` | Notifies phone session ended | — |
| `SCORES` | Sends final scores at session end | `{ scores: PlayerScore[] }` |

### Phone → Host Messages

| Type | Description | Payload |
|------|-------------|---------|
| `TRACKER_SIGNAL` | Returns signal data back during handshake | `{ signal: SimplePeerSignalData }` |
| `ADD_TO_QUEUE` | Phone requests a song to be added | `{ song: SongMeta }` |
| `REMOVE_FROM_QUEUE` | Phone requests removal | `{ songId: string }` |
| `SUNG_SEGMENT` | Real-time singing pitch data for visual trails | `{ playerId: string, segments: SungSegment[] }` |

---

## 5. Web Push & ntfy Notification Protocol

Used by asynchronous games (e.g. Geschichtenschreiber / Storyteller) to notify sleeping or background mobile devices:

```typescript
interface PushNotificationPayload {
  title: string;
  body: string;
  url: string;        // Deep link into active game session
  gameId: string;
  turnPlayer: string;
}
```

- Dispatched via Cloudflare Push Relay (`server/cloudflare-push-relay/index.ts`).
- Service Worker (`public/sw-push.js`) wakes on message and focuses or opens the target game route upon click.

---

## 6. Storage Keys & Session Persistence

All storage operations use `src/lib/storage.ts` with typed `STORAGE_KEYS`:

| Key | Type | Purpose |
|-----|------|---------|
| `STORAGE_KEYS.MELODIQ_ACTIVE_SESSION` | `ActiveSession \| null` | Persists active game session across refreshes |
| `STORAGE_KEYS.MELODIQ_SETTINGS` | `MelodiqSettings` | User-level settings (latency, theme, mic) |
| `STORAGE_KEYS.GAME_RELAY_PREFIX` | `string` | Custom push relay endpoint for game sessions |
