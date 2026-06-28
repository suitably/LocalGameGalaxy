# UI Auto-detect Self-Hosted Tracker Tasks

Tracking implementation of the self-hosted tracker UI improvements and connection stabilization.

- [x] Expose `activeTrackerUrls` in `WebRTCHostContext` context provider <!-- id: 1 -->
- [x] Adapt `MockWebRTCProvider` in `MelodiqTV.tsx` to avoid type errors <!-- id: 2 -->
- [x] Retrieve and use `activeTrackerUrls` inside `DeviceConnection.tsx` for QR code/Manual URL <!-- id: 3 -->
- [x] Render self-hosted tracker with a "Self-Hosted" badge in `DeviceConnection.tsx` and hide its delete button <!-- id: 4 -->
- [x] Fix reconnect loop by checking `trackerPeer.id` / `nextPeer.id` before falling back to random IDs in `useWebRTCClient.ts`, `WebRTCHostManager.ts`, and `phone-client.ts` <!-- id: 5 -->
- [x] Verify code builds successfully with zero compiler warnings or errors <!-- id: 6 -->

ID: UI-AUTODETECT-TRACKER-TASKS
