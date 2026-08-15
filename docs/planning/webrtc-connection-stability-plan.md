# Implementation Plan: WebRTC Connection Stability & Multi-Device Refactor

## Problem Description
Users experience severe connection delays ("Connecting to party..." stuck for a long time) and erratic multi-phone behavior (one phone shown, then 2x duplicated, then disappearing/disconnecting).

### Root Causes
1. **Phone-to-Phone Discovery Deadlock**: BitTorrent tracker swarms introduce all clients in the party room to each other. When multiple phones join, Phone 1 and Phone 2 discover each other as tracker peers. Because `useWebRTCClient` indiscriminately created WebRTC `SimplePeer` offers for every discovered tracker peer (assuming every peer was the Host), phones created deadlock offers to each other that never received answers, exhausting the `candidatePeers` pool and blocking the real Host connection for the full 15-second timeout.
2. **Duplicate Peer Creation on Host**: When a phone reconnected or sent offers across multiple tracker channels, `WebRTCHostManager` assigned a new `peerId` and added duplicate generic entries ("Phone 1", "Phone 2") to the peer list before receiving the `identify` handshake with `deviceId`. When one stale channel closed, it triggered cascaded disconnections of the active peer.
3. **Overly Long Timeouts**: `CONNECTION_TIMEOUT_MS` was set to 15,000ms. If a candidate channel was dead, the client waited 15s before attempting the next candidate.
4. **Missing Host Role Handshake on Signaling Layer**: Channel 1 (tracker peer) lacked a fast host handshake (`host_hello`) to immediately differentiate the Host from other client phones.

## Proposed Changes

### 1. Signaling Layer Role Handshake (`WebRTCHostManager.ts` & `useWebRTCClient.ts`)
- **Host**: As soon as a tracker peer connects on Channel 1, Host sends `{ type: 'host_hello', partyId }`.
- **Client**: When a tracker peer connects on Channel 1, Client sends `{ type: 'client_probe', partyId, deviceId }`.
- **Client**: Client ONLY starts the WebRTC Data & Audio peer (Channel 2) when it receives `{ type: 'host_hello', partyId }` from that tracker peer. This completely prevents phones from connecting to other phones.
- Host responds to any `{ type: 'client_probe' }` with `{ type: 'host_hello', partyId }`.

### 2. Host Peer Deduplication by `deviceId` (`WebRTCHostManager.ts` & `WebRTCHostContext.tsx`)
- In `WebRTCHostManager.ts`:
  - When a new DataPeer connects and identifies with `deviceId`, check if an existing peer with the same `deviceId` exists.
  - If a stale connection exists for that `deviceId`, cleanly terminate the old connection and replace it with the new active peer instance without duplicating peer entries.
- In `WebRTCHostContext.tsx`:
  - Ensure `peers` state deduplicates by `deviceId`, updating the existing entry's `peerId` and `connectionId` in-place so roles, roster positions, and UI stay stable.

### 3. Connection Timeout & Candidate Tuning (`useWebRTCClient.ts`)
- Reduce `CONNECTION_TIMEOUT_MS` from 15000ms to 6000ms for fast failover.
- Keep `candidatePeersRef` bounded to valid Host candidates only.

### 4. Robust Tracker List Defaults
- Include reliable public trackers (`wss://tracker.openwebtorrent.com`, `wss://tracker.btorrent.xyz`, `wss://tracker.webtorrent.dev`) alongside local helper tracker.

## Verification Plan
1. Unit test the role handshake logic and URL generation.
2. Run `npm run lint` and `npm run build` to verify clean compilation.
3. Verify multi-device connection behavior and deduplication.
4. Create walkthrough log in `docs/verification/webrtc-connection-stability-walkthrough.md`.
