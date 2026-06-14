# WSS Integration Tasks

Track progress of integrating the bittorrent-tracker signaling server into the melodiq-helper backend.

## Tasks

- [x] Create `wss-integration-tasks.md` and link in `docs/tasks/00_SUMMARY.md` <!-- id: 0 -->
- [x] Implement local WebRTC signaling tracker server in backend helper (`server/index.js`) <!-- id: 1 -->
- [x] Expose tracker path / fallback dynamically in frontend configuration (`src/lib/webrtc/WebRTCHostContext.tsx` or similar) <!-- id: 2 -->
- [x] Update frontend UI to show local tracker status and auto-inject IP address <!-- id: 3 -->
- [x] Test local connection flow between host and clients <!-- id: 4 -->
- [x] Document changes in `docs/verification/wss-integration-walkthrough.md` <!-- id: 5 -->

ID: WSS-INTEGRATION-TASKS
