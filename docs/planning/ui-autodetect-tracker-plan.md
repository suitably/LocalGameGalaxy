# UI Auto-detect Self-Hosted Tracker Plan

This plan outlines the changes to show and integrate the self-hosted local WebRTC tracker URL automatically in the host settings connection UI, as well as fixing a critical reconnect loop.

## Goal
Improve the WebRTC settings UI to automatically display the dynamically injected self-hosted tracker URL, badge it as "Self-Hosted", ensure it is automatically embedded in generated QR codes/manual URLs, and fix a bug causing a reconnect loop when clients connect via `bittorrent-tracker`.

## Proposed Changes
1. **`src/lib/webrtc/WebRTCHostContext.tsx`**:
   - Expose `activeTrackerUrls` through `WebRTCHostContext` context value.
2. **`src/components/connection/DeviceConnection.tsx`**:
   - Consume `activeTrackerUrls` from the WebRTC host context.
   - Use `activeTrackerUrls` for generating client connection QR codes and manual copy links.
   - Map `activeTrackerUrls` in the tracker list UI, and render a "Self-Hosted" Chip badge for the local tracker while hiding/disabling its delete action.
3. **`src/games/melodiq/MelodiqTV.tsx`**:
   - Update `MockWebRTCProvider`'s mocked context definition to include `activeTrackerUrls` to prevent compilation errors.
4. **WebRTC Client & Manager Peer ID Resolution**:
   - Update `src/lib/webrtc/useWebRTCClient.ts`, `src/lib/webrtc/WebRTCHostManager.ts`, and `src/games/melodiq/phone-client.ts` to check `trackerPeer.id` / `nextPeer.id` before falling back to `_id` and `channelName`. This prevents a random ID from being generated on every tracker announce, which triggered duplicate connection attempts and a constant reconnect loop.

## Verification Plan
1. Compile the workspace using `npm run build` and ensure no TypeScript errors exist.
2. Verify that client-host connection succeeds and remains stable without falling into a reconnect loop.

ID: UI-AUTODETECT-TRACKER-PLAN
