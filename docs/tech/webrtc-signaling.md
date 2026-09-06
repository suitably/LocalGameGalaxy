# WebRTC Signaling & Connection Architecture [ID: TECH-WEBRTC-SIGNALING]

This document details the WebRTC peer-to-peer communication stack, signaling flow, peer discovery, connection establishment, and retry/recovery mechanics utilized in LocalGameGalaxy.

---

## 1. Signaling & Discovery Layer

LocalGameGalaxy operates in a local-network environment but supports internet-based discovery via WebRTC. Standard WebRTC requires a signaling server to exchange connection offers, answers, and ICE candidate metadata. To avoid hosting dedicated signaling servers, the application leverages the **BitTorrent Tracker Protocol** over WebSockets.

### Announce InfoHash Mapping
Rather than exchanging hashes of torrent files, the game maps the active **Room ID / Party ID** to a unique 20-byte InfoHash:

```typescript
const stringToInfoHash = (partyId: string): Uint8Array => {
    const hash = new Uint8Array(20);
    const encoder = new TextEncoder();
    const strBuf = encoder.encode(partyId);
    for (let i = 0; i < 20; i++) {
        hash[i] = strBuf[i % strBuf.length];
    }
    return hash;
};
```

Both the **Host** and **Phone Clients** announce themselves to the WebSocket tracker (`announce` URLs) under this shared InfoHash. The tracker server then returns a list of connected peers sharing the same InfoHash.

---

## 2. Dual-Connection Handshake Flow

WebRTC negotiation utilizes two distinct connection types:

1. **Tracker Peer (Signaling Channel)**: A virtual signaling connection established through the WebSocket tracker. This channel is used solely to exchange SDP signals (wrapped in `{ connectionId, signal }` JSON packages).
2. **Data Peer (Application Channel)**: The actual peer-to-peer WebRTC connection created via `simple-peer` which streams raw microphone audio and exchanges high-frequency gameplay data.

```
       Host Browser                          BitTorrent Tracker                       Phone Client
            │                                         │                                    │
            │── Announce (InfoHash) ─────────────────►│                                    │
            │                                         │◄── Announce (InfoHash) ────────────│
            │                                         │                                    │
            │◄── Peer List (includes Phone info) ─────│                                    │
            │                                         │── Peer List (includes Host info) ─►│
            │                                         │                                    │
            │◄================== Establish Tracker Peer (Signaling Channel) =============►│
            │                                         │                                    │
            │── Create Data Peer (initiate: false)    │                                    │
            │   (Host waits for Phone's offer)        │                                    │
            │                                         │── Create Data Peer (initiate: true)│
            │                                         │   (Phone sends WebRTC Offer)       │
            │                                         │                                    │
            │◄── Wrapped SDP Offer (via Tracker) ─────│◄── send({connectionId, offer}) ────│
            │                                         │                                    │
            │── send({connectionId, answer}) ────────►│── Wrapped SDP Answer ─────────────►│
            │                                         │                                    │
            │◄================== WebRTC ICE Candidate Exchange (STUN) ===================►│
            │                                         │                                    │
            │◄================== Direct WebRTC P2P Data & Audio Stream Connected =======►│
```

---

## 3. WebRTC Client Lifecycle (`useWebRTCClient.ts`)

The phone client manages its connection via the `useWebRTCClient` React hook:

- **State Gating**: A connection attempt is triggered automatically on mount if `autoConnect` is enabled, or manually via `reconnect()`.
- **Media Acquisition**: The hook requests microphone permissions via `getMediaStream()` option and binds the returned `MediaStream` to the WebRTC connection before initiating negotiation.
- **Race Condition Handling**: Multiple tracker peers might be returned. The client initiates up to `MAX_CANDIDATES` (5) connections concurrently. The first connection to fire the `connect` event "wins the race" and becomes the active peer (`peerRef.current`). The other candidates are immediately destroyed to conserve battery and CPU.
- **Identification Handshake**: Upon connection, the client sends an `identify` message containing the player's profile (name, avatar color hue, and persistent device ID).

---

## 4. Reconnection and Resiliency

Local WebRTC connections can drop due to phone sleep states, network switches, or temporary physical interference. The following retry mechanics are implemented:

- **Signaling Timeout**: If a connection attempt takes longer than `CONNECTION_TIMEOUT_MS` (15 seconds), the candidate peer is automatically destroyed, triggering `processNextPendingPeer` to try another tracker peer.
- **Auto-Reconnect**: On connection loss (`close` or `error` events), if `autoConnect` is active, the client schedules a connection retry after 2 seconds.
- **Stale State Recovery**: If a client reconnects using an identical `deviceId`, the host matches it to the existing player record and updates the session references rather than instantiating a new player slot.

---

## 5. Signaling Tracker Orchestration & Companion Server Coexistence

The signaling infrastructure manages multiple trackers with distinct classifications and precedence rules:

1. **Self-Hosted Backend Tracker**: Automatically derived from the configured Nexumia Companion Server URL (`storage.getHelperUrl()` / `melodiq_helper_url`).
2. **Default Free Public Fallback Trackers**: Reliable public BitTorrent WebTorrent trackers (`wss://tracker.openwebtorrent.com`, `wss://tracker.btorrent.xyz`, `wss://tracker.webtorrent.dev`).
3. **Custom User Trackers**: Manually added by users in the Device Connection settings.

### Coexistence and Default Activation Rules
- **No Backend Configured**: Free public trackers are **enabled by default** to ensure out-of-the-box phone connectivity without setup hurdles.
- **Backend Configured**: When a self-hosted companion server is present, the self-hosted tracker is enabled by default, while free public trackers remain listed in the UI but are **deactivated by default**. This ensures local/private signaling takes precedence without leaking data to public trackers, while avoiding accidental tracker removal. Users can explicitly reactivate individual public fallback trackers at any time via the UI toggle switch.
- **Preferences Persistence**: Explicit user overrides per tracker URL are persisted in `${gameId}_tracker_preferences` via `storage.ts`.

