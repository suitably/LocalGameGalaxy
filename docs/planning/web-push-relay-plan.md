# Web Push Relay & Game-Scoped Notifications Implementation Plan [ID: PLAN-WEB-PUSH-RELAY]

## Goal Description
Enable real-time OS-level push notifications for game turns (e.g. GuessArt / Montagsmaler) when the browser is completely closed or running in the background.
Implement a **Host-Driven, Game-Scoped Push Relay Architecture**:
1. **Cloudflare Worker Push Relay**: A serverless, 24/7 free Cloudflare Worker service providing VAPID key generation, push subscription storage, and push dispatching to Google (FCM), Apple (APNs), and Mozilla (Autopush).
2. **Self-Hosted Docker Push Relay**: Equivalent `/api/push/*` endpoints on the self-hosted Nexumia server for self-hosting enthusiasts.
3. **ServiceWorker Web Push Handler**: Background ServiceWorker listeners (`push` & `notificationclick`) to display native notifications on closed/background devices and deep-link directly into the active game on click.
4. **Game-Scoped Relay Onboarding (Zero-Touch Client)**:
   - When the host shares a game link, `&gameRelay=...` is attached.
   - When friends open the link, the relay is silently saved **only for that game session** in `sessionStorage` (`game_relay_<gameId>`).
   - Friends' global server settings (`melodiq_helper_url`) remain untouched and clean.
   - When a turn completes, push events are dispatched through the game's relay to wake up closed devices.

---

## Component Architecture & SOLID Breakdown

```
src/
├── lib/
│   └── push/
│       ├── pushClient.ts           # Client-side PushManager registration, VAPID decoding & relay API
│       ├── pushTypes.ts            # TypeScript interfaces for push subscriptions & payloads
│       └── gameRelayStorage.ts     # Game-scoped session storage isolation (non-polluting)
public/
└── sw-push.js                      # Background ServiceWorker push & notificationclick event handler
server/
├── cloudflare-push-relay/
│   ├── worker.ts                   # Standalone Cloudflare Worker Web Push implementation
│   └── wrangler.toml               # Cloudflare deployment configuration
├── src/
│   ├── controllers/
│   │   └── pushController.js       # Self-hosted Push subscription & dispatch controller
│   ├── routes/
│   │   └── push.js                 # Express router for /api/push/*
│   └── services/
│       └── webPushService.js       # VAPID crypto & Web Push RFC 8030 HTTP client
└── test/
    └── push.test.js                # Unit tests for push endpoints & VAPID signing
```

---

## Verification Plan

### Automated Checks
- `npm test` in `server/` testing push subscription storage, VAPID key distribution, and push dispatch.
- `npm run lint` — verify zero ESLint errors.
- `npm run build` (`tsc -b && vite build`) — verify TypeScript type safety and production service worker bundling.

### Manual / Integration Verification
- Verify `sw-push.js` is bundled and imported by Workbox into `dist/sw.js`.
- Verify game link generation attaches `&gameRelay=...` when relay is configured.
- Verify guest opening the link saves relay strictly to `sessionStorage` without altering `localStorage.melodiq_helper_url`.
