# Web Push Relay & Game-Scoped Notifications Tasks [ID: TASKS-WEB-PUSH-RELAY]

- [x] Phase 1: Planning & Architecture Design <!-- id: 0 -->
  - [x] Create Implementation Plan (`docs/planning/web-push-relay-plan.md`) <!-- id: 1 -->
- [x] Phase 2: Service Worker & Client Push Module <!-- id: 2 -->
  - [x] Create `public/sw-push.js` with `push` and `notificationclick` listeners <!-- id: 3 -->
  - [x] Configure `vite.config.ts` Workbox `importScripts: ['/sw-push.js']` <!-- id: 4 -->
  - [x] Create `src/lib/push/pushTypes.ts`, `src/lib/push/gameRelayStorage.ts`, and `src/lib/push/pushClient.ts` <!-- id: 5 -->
- [x] Phase 3: Game Integration (GuessArt & Party Lobby) <!-- id: 6 -->
  - [x] Integrate game-scoped relay URL generation into GuessArt share links and party lobby <!-- id: 7 -->
  - [x] Hook `pushClient.sendPushNotificationForGame` into GuessArt drawing completion and turn transitions <!-- id: 8 -->
- [x] Phase 4: Backend Relays (Cloudflare Worker & Self-Hosted Server) <!-- id: 9 -->
  - [x] Create Cloudflare Worker Push Relay (`server/cloudflare-push-relay/`) <!-- id: 10 -->
  - [x] Implement self-hosted push routes in Nexumia Server (`server/src/routes/push.js`, `server/src/controllers/pushController.js`, `server/src/services/webPushService.js`) <!-- id: 11 -->
  - [x] Write server unit tests in `server/test/push.test.js` <!-- id: 12 -->
- [x] Phase 5: Verification & Documentation <!-- id: 13 -->
  - [x] Run `npm test` in `server/` <!-- id: 14 -->
  - [x] Run `npm run lint` and `npm run build` <!-- id: 15 -->
  - [x] Write verification walkthrough (`docs/verification/web-push-relay-walkthrough.md`) <!-- id: 16 -->
  - [x] Update `docs/tech/architecture.md` <!-- id: 17 -->
