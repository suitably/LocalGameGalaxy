# Web Push Relay & Game-Scoped Notifications Walkthrough [ID: VERIFY-WEB-PUSH-RELAY]

## Changes Implemented

### 1. Web Push Service Worker Background Handlers
- Created [`public/sw-push.js`](file:///home/deck/Projects/LocalGameGalaxy/public/sw-push.js) with:
  - `push` event listener parsing push payloads (title, body, url, tag) and invoking `self.registration.showNotification(...)`.
  - `notificationclick` event listener that focuses an existing app window or opens a new window directly navigating to the target game URL (`/#/games/guessart?gameId=...`).
- Configured [`vite.config.ts`](file:///home/deck/Projects/LocalGameGalaxy/vite.config.ts) Workbox with `importScripts: ['/sw-push.js']`.

### 2. Client Push Manager & Game-Scoped Relay Storage
- [`src/lib/push/pushTypes.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/lib/push/pushTypes.ts): TypeScript interfaces for push subscriptions, payloads, and API requests.
- [`src/lib/push/gameRelayStorage.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/lib/push/gameRelayStorage.ts): Stores relay URLs strictly in `sessionStorage` (`galaxy_game_relay_<gameId>`) for the specific match without polluting guest users' global `localStorage` settings.
- [`src/lib/push/pushClient.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/lib/push/pushClient.ts):
  - Automatically handles VAPID public key retrieval, `registration.pushManager.subscribe()`, and relay registration.
  - Dispatches Web Push requests to the game's relay on turn completion.

### 3. Game Integration (GuessArt & Party Lobby)
- [`src/games/guessart/components/SharePlayerLinksDialog.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/games/guessart/components/SharePlayerLinksDialog.tsx): Appends `&gameRelay=...` when the host has a configured relay.
- [`src/games/guessart/hooks/useGuessArtGame.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/games/guessart/hooks/useGuessArtGame.ts):
  - Extracts `gameRelay` into `gameRelayStorage`.
  - Auto-subscribes local players for Web Push.
  - Sends push triggers on drawing/guessing turn completion to wake up background/closed devices.
- [`src/features/party/PartyLobby.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/features/party/PartyLobby.tsx): Uses `&gameRelay=...` for party invite links.

### 4. Backend Relays (Cloudflare Worker & Self-Hosted Server)
- **Cloudflare Worker**: Standalone 24/7 zero-cost push relay template in [`server/cloudflare-push-relay/worker.ts`](file:///home/deck/Projects/LocalGameGalaxy/server/cloudflare-push-relay/worker.ts) and [`server/cloudflare-push-relay/wrangler.toml`](file:///home/deck/Projects/LocalGameGalaxy/server/cloudflare-push-relay/wrangler.toml).
- **Self-Hosted Server**:
  - [`server/src/services/webPushService.js`](file:///home/deck/Projects/LocalGameGalaxy/server/src/services/webPushService.js): VAPID keypair generation and Web Push delivery via `web-push`.
  - [`server/src/controllers/pushController.js`](file:///home/deck/Projects/LocalGameGalaxy/server/src/controllers/pushController.js) & [`server/src/routes/push.js`](file:///home/deck/Projects/LocalGameGalaxy/server/src/routes/push.js): Exposed `/api/push/vapid-public-key`, `/api/push/subscribe`, `/api/push/unsubscribe`, `/api/push/notify`.
  - [`server/src/middleware/auth.js`](file:///home/deck/Projects/LocalGameGalaxy/server/src/middleware/auth.js): Exempted public push relay endpoints from master token checks.

---

## Verification Results

1. **Server Unit Tests**: `npm test` in `server/` passed (10/10 tests passing).
   - VAPID key generation and retrieval verified.
   - Game subscription registration and unsubscription verified.
   - Sender player exclusion in push notifications verified.
2. **Frontend Quality**: `npm run lint` and `npm run build` passed with 0 errors.
   - `dist/sw.js` correctly generated with `sw-push.js` imported.
3. **Architecture Documentation**: Updated [`docs/tech/architecture.md`](file:///home/deck/Projects/LocalGameGalaxy/docs/tech/architecture.md).
