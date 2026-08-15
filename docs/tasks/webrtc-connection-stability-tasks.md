# Tasks: WebRTC Connection Stability & Multi-Device Refactor

- [x] 1. Signaling Layer Role Handshake (Host & Client) <!-- id: task-001 -->
  - [x] Update `WebRTCHostManager.ts` to emit `host_hello` on tracker peer connect and handle `client_probe` <!-- id: task-001a -->
  - [x] Update `useWebRTCClient.ts` to send `client_probe` and only initiate SimplePeer with verified Host peers <!-- id: task-001b -->
- [x] 2. Host Peer Deduplication & Lifecycle Management <!-- id: task-002 -->
  - [x] Implement `deviceId` based peer replacement in `WebRTCHostManager.ts` <!-- id: task-002a -->
  - [x] Implement robust `deviceId` deduplication in `WebRTCHostContext.tsx` <!-- id: task-002b -->
- [x] 3. Timeout Tuning & Reconnect Robustness <!-- id: task-003 -->
  - [x] Optimize `CONNECTION_TIMEOUT_MS` in `useWebRTCClient.ts` <!-- id: task-003a -->
  - [x] Add default tracker fallbacks in `WebRTCHostContext.tsx` and `PhoneClientEngine.tsx` <!-- id: task-003b -->
- [x] 4. Verification & Documentation <!-- id: task-004 -->
  - [x] Run unit tests (`npm run test`) <!-- id: task-004a -->
  - [x] Run `npm run lint` and `npm run build` <!-- id: task-004b -->
  - [x] Create `docs/verification/webrtc-connection-stability-walkthrough.md` <!-- id: task-004c -->
  - [x] Update `docs/planning/00_SUMMARY.md`, `docs/tasks/00_SUMMARY.md`, `docs/verification/00_SUMMARY.md` <!-- id: task-004d -->
