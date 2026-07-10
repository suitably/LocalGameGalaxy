# Cross-Device Synchronization Protocol [ID: TECH-SYNC-PROTOCOL]

> [!IMPORTANT]
> This document is the Single Source of Truth for all message schemas and synchronization protocols used between the Host, TV Mode, and Phone Clients. Update this document whenever message payloads change.

---

## 1. Communication Channels Overview

LocalGameGalaxy uses three distinct inter-process communication mechanisms depending on the target:

| Channel | Used For | Technology |
|---------|----------|------------|
| **BroadcastChannel** (`melodiq_tv_control`) | Host → TV Mode (same browser) | Web BroadcastChannel API |
| **Presentation API** | Host → TV Mode (external display) | W3C Presentation API |
| **WebRTC DataChannel** | Host ↔ Phone Clients | SimplePeer / WebRTC |
| **Custom DOM Events** (`melodiq_client_send_data`) | Internal component sync | `window.dispatchEvent` |

---

## 2. BroadcastChannel & Presentation API Messages (Host → TV)

All messages sent over `melodiq_tv_control` BroadcastChannel or via the Presentation API share the same schema:

```typescript
interface TVMessage {
  type: TVMessageType;
  payload?: unknown;
}

type TVMessageType =
  | 'PLAY_SONG'
  | 'STOP_SONG'
  | 'PAUSE_SONG'
  | 'GAME_STATE'
  | 'PING';
```

### Message Payloads

#### `PLAY_SONG`
Sent when the Host starts playing a song. TV Mode begins rendering lyrics and visuals.
```typescript
{
  type: 'PLAY_SONG',
  payload: {
    songId: string;
    title: string;
    artist: string;
    audioUrl: string;
    lyrics: ParsedLine[];       // Parsed UltraStar lyric lines
    bpm: number;                // Beats per minute from UltraStar header
    gap: number;                // Timing gap in ms from UltraStar header
    startTime: number;          // Unix timestamp when playback began
  }
}
```

#### `STOP_SONG`
Sent when playback ends, is cancelled, or a new song starts.
```typescript
{ type: 'STOP_SONG' }
```

#### `GAME_STATE`
Periodic or event-triggered full state sync from Host to TV. TV Mode applies this to update player scores and visual trails.
```typescript
{
  type: 'GAME_STATE',
  payload: {
    players: PhonePlayer[];     // Connected players with scores
    currentTime: number;        // Current audio playback position (seconds)
    sungSegments: SungSegment[]; // Array of pitch history for visual trails
  }
}
```

#### `PING`
Keepalive used to detect when the TV connection is lost.
```typescript
{ type: 'PING' }
```

---

## 3. WebRTC DataChannel Messages (Host ↔ Phone)

Phone Clients and the Host exchange JSON-serialized messages over a WebRTC DataChannel.

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

## 4. Session State Keys (localStorage)

| Key | Type | Purpose |
|-----|------|---------|
| `melodiq_active_session` | `ActiveSession \| null` | Persists active game session across refreshes |
| `melodiq_settings` | `MelodiqSettings` | User-level settings (latency, theme, mic) |
| `lgg_theme` | `'dark' \| 'light'` | Global app theme preference |

> [!WARNING]
> The `melodiq_active_session` key is written by both the Host and the Phone Client recovery path. A versioned schema (`{ version: number, data: ... }`) should be enforced to prevent deserialization conflicts (see issue #20).
