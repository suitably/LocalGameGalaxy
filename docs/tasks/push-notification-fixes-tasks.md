# Push Notification Fixes - Tasks [ID: TASKS-PUSH-FIX]

- [x] Fix 1: gameRelayStorage.ts — sessionStorage → localStorage with TTL
- [x] Fix 2: Cloudflare Worker — VAPID JWT + Web Push encryption (webpush.ts)
- [x] Fix 2b: Cloudflare Worker — integrate webpush.ts into worker.ts notify endpoint
- [x] Fix 3: wrangler.toml — document KV namespace binding + VAPID secrets
- [x] Fix 4: webPushService.js — persist subscriptions to file
- [x] Verification: npm run lint + npm run build + npm test
- [x] Update architecture docs
- [x] Create walkthrough
