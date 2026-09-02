# Push Notification Fixes - Implementation Plan [ID: PLAN-PUSH-FIX]

## Goal
Fix all 4 identified issues preventing GuessArt push notifications from working when the app is closed.

## Proposed Changes

### Fix 1: Persistent Relay Storage
- **File**: `src/lib/push/gameRelayStorage.ts`
- Switch `sessionStorage` → `localStorage` with game-scoped prefix
- Add TTL-based cleanup (7 days) for stale relay entries

### Fix 2: Cloudflare Worker VAPID Signing + Payload Encryption
- **File**: `server/cloudflare-push-relay/worker.ts`
- **New**: `server/cloudflare-push-relay/webpush.ts`
- Implement RFC 8291 encryption + VAPID JWT via Web Crypto API

### Fix 3: Enable Cloudflare KV Persistence
- **File**: `server/cloudflare-push-relay/wrangler.toml`

### Fix 4: Server-Side Subscription Persistence
- **File**: `server/src/services/webPushService.js`
- Persist subscriptions to `.push_subscriptions.json`

## Verification Plan
- `npm run lint` — zero errors
- `npm run build` — zero errors
- `npm test` in `server/` — all tests passing
