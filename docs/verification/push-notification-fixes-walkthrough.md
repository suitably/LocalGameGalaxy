# Push Notification Fixes Walkthrough [ID: VERIFY-PUSH-FIX]

## Changes Implemented

### Fix 1: Persistent Relay Storage (Critical)
- **File**: [`src/lib/push/gameRelayStorage.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/lib/push/gameRelayStorage.ts)
- Switched from `sessionStorage` to `localStorage` with game-scoped key prefix (`galaxy_game_relay_<gameId>`)
- Added TTL-based expiration (7 days) with automatic stale-entry cleanup
- Added backward-compatible migration for any legacy plain-string entries
- **Impact**: Relay URLs now survive app/tab closures, so push subscription registration persists

### Fix 2: Cloudflare Worker VAPID Signing + Payload Encryption (Critical)
- **New**: [`server/cloudflare-push-relay/webpush.ts`](file:///home/deck/Projects/LocalGameGalaxy/server/cloudflare-push-relay/webpush.ts)
  - RFC 8292 VAPID JWT signing via Web Crypto API (ECDSA P-256 / ES256)
  - RFC 8291 payload encryption (ECDH key agreement + HKDF + AES-128-GCM)
  - DER-to-raw ECDSA signature conversion for JWT compatibility
- **Updated**: [`server/cloudflare-push-relay/worker.ts`](file:///home/deck/Projects/LocalGameGalaxy/server/cloudflare-push-relay/worker.ts)
  - Integrated `sendWebPush()` for proper encrypted/signed push delivery
  - Added expired subscription cleanup (404/410 endpoint removal)
  - Enforced VAPID key presence with proper error responses
  - Improved type safety (removed `any` casts)
- **Impact**: Push notifications will no longer be rejected by FCM/Mozilla Autopush

### Fix 3: Cloudflare KV Documentation
- **File**: [`server/cloudflare-push-relay/wrangler.toml`](file:///home/deck/Projects/LocalGameGalaxy/server/cloudflare-push-relay/wrangler.toml)
- Added clear documentation for VAPID secret setup and KV namespace binding

### Fix 4: Server-Side Subscription Persistence
- **File**: [`server/src/services/webPushService.js`](file:///home/deck/Projects/LocalGameGalaxy/server/src/services/webPushService.js)
- Added file-based persistence to `.push_subscriptions.json`
- Debounced writes (5s) to avoid disk thrashing
- Loaded on module init, saved on SIGINT/SIGTERM/beforeExit
- Expired subscriptions filtered out on load
- **Impact**: Push subscriptions survive server restarts

### Additional Changes
- [`.gitignore`](file:///home/deck/Projects/LocalGameGalaxy/.gitignore): Added `.push_subscriptions.json` and `.vapid_keys.json`
- [`docs/tech/architecture.md`](file:///home/deck/Projects/LocalGameGalaxy/docs/tech/architecture.md): Updated Web Push architecture section

## Verification Results

1. **ESLint**: `npm run lint` — **0 errors** (459 pre-existing warnings, unchanged)
2. **Build**: `npm run build` — Exit code 0, `dist/sw.js` generated. 3 pre-existing TS7006 warnings in DrawingCanvas.tsx (unrelated)
3. **Server Tests**: `npm test` in `server/` — **10/10 tests passing**

## Outstanding Issues

- The Cloudflare Worker requires VAPID keys to be set as Worker Secrets before deployment:
  ```
  npx wrangler secret put VAPID_PUBLIC_KEY
  npx wrangler secret put VAPID_PRIVATE_KEY
  ```
- For production Cloudflare deployment, KV namespace should be enabled in `wrangler.toml`
