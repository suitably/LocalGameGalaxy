# ADR-0002: Use BitTorrent Tracker Network for WebRTC Signaling

## Status
Accepted

## Context
WebRTC requires a signaling mechanism to exchange connection offers (SDP) and ICE candidates between peers before a direct peer-to-peer connection can be established. This signaling channel must be accessible by all participants (Host + Phone Clients) before any direct connection exists.

## Decision
Use the **BitTorrent tracker protocol** (via `bittorrent-tracker` npm package and `simple-peer`) for WebRTC peer discovery and signaling. A local tracker instance (`npm run tracker`) is preferred; public BitTorrent tracker servers (e.g., `wss://tracker.openwebtorrent.com`) are used as fallback.

## Alternatives Considered
- **Dedicated WebSocket Signaling Server**: Requires always-on server infrastructure and maintenance. Adds DevOps overhead for a primarily offline-first, LAN-based app.
- **QR Code Manual Exchange**: Each peer exchange would require a user action, making multi-peer sessions (6+ players) impractical.
- **Firebase Realtime Database**: Would require internet connectivity and a paid Firebase account, breaking the offline-first requirement.

## Consequences
**Positive**:
- No dedicated signaling server to host or maintain for local-network use.
- The same `bittorrent-tracker` package already bundled for the companion server can optionally host a local tracker.
- Works offline on local networks when using the local tracker.
- Public tracker fallback enables internet-based testing without extra infrastructure.

**Negative**:
- Public BitTorrent trackers are not guaranteed to be available or fast.
- Some ISPs or corporate firewalls block BitTorrent protocol traffic, breaking fallback signaling.
- The signaling path is not private on public trackers (though SDP payloads don't contain user data).
