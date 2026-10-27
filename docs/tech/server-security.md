---
type: Reference
title: 'Companion server security model'
description: 'Transport (no TLS in the server; tunnel or proxy), master token and API keys, which routes requireAuth / requireMasterToken protect, CORS and Private Network Access behaviour, and the known gaps in the tabletop and relay plugins.'
tags: [security, auth, cors, pna, server, tokens]
status: stable
generated:
  at: 2026-10-18T15:00:00+02:00
  by: claude-code
verified:
  at: 2026-10-27
  method: 'read server/src/core/app.ts, server/src/plugins/melodiq/{index.ts,middleware/auth.ts,routes/songFiles.ts,routes/notesMigration.ts}, server/src/plugins/tabletop/routes/*.ts, server/src/plugins/notes/index.ts, server/src/plugins/relay/index.ts, server/src/utils/helpers.ts, server/src/core/pairing.ts'
sources:
  - 'server/src/plugins/melodiq/middleware/auth.ts'
  - 'server/src/core/app.ts'
  - 'server/src/core/pairing.ts'
  - 'merged from: previous version of 2026-09-27'
---

# Server Security Model & Authentication

> [!CAUTION]
> This document contains descriptions of security-sensitive flows. Never commit real tokens, private keys, or certificates to the repository. See [secrets-management.md](secrets-management.md) for configuration setup.

---

## 1. Overview

The Melodiq Helper Server implements a multi-layer security model designed for trusted local-network use. It is **not** designed for public internet exposure without additional hardening.

```
┌──────────────────────────────────────────────────────────┐
│  React SPA (Phone / Host / TV)                           │
│                                                          │
│  1. HTTPS / WSS ──► Encrypted transport (Tunnel/Proxy)   │
│  2. Authorization: Bearer <token> ──► Master token or    │
│                                       API key auth       │
└────────────────────────┬─────────────────────────────────┘
                         │ Local Network / Internet
                         ▼
┌──────────────────────────────────────────────────────────┐
│  Melodiq Companion Server (Node.js / Hono TypeScript)    │
│                                                          │
│  • CORS & Private Network Access (PNA) headers           │
│  • Token middleware (Bearer auth / API key capabilities) │
│  • Hono plugins: melodiq, relay (rooms), tabletop        │
└──────────────────────────────────────────────────────────┘
```

---

## 2. TLS & Reverse Proxy Architecture

The companion server runs an HTTP listener on a single port (`PORT`, default 3000) and offloads TLS termination to external reverse proxies or tunnels:

1. **Production / Remote Access**: Terminated via Reverse Proxy (Nginx, Traefik, Caddy, Pangolin) or the built-in Cloudflare Quick Tunnel (`server/src/core/tunnel.ts`).
2. **Local Browser Access & PNA**: When accessed over local IP networks from an HTTPS client, Chrome and modern browsers require **Private Network Access (PNA)** preflight headers. The Hono server automatically responds with `Access-Control-Allow-Private-Network: true`.

---

## 3. Master Security Token

Every authenticated API request from the SPA to the server must include a **Bearer token** in the `Authorization` header (or `?token=` query param):

```
Authorization: Bearer <token>
```

The token is stored in `config.json` and loaded at server startup via `server/src/config.ts`. The SPA gets a token from the one-time pairing link (§3a), the setup wizard's pre-configured `config.json`, or manual input and keeps it in `localStorage` (`STORAGE_KEYS.HELPER_TOKEN`) until changed.

**Token validation middleware** (`server/src/core/auth.ts`, re-exported by `server/src/plugins/melodiq/middleware/auth.ts`):

- Reads `Authorization: Bearer <token>` or the `?token=` query parameter.
- Applied by the `melodiq` plugin to: `/api/songs*`, `/api/status`, `/api/auth/me`, `/media`, `/api/usdb/*`, `/api/youtube/*`, `/api/separator/*`, `/api/config/*`, `/api/playlists*`, `/api/browse`, `/api/feedback`, `/api/notes/*` (`server/src/plugins/melodiq/index.ts`). Public: `/health`, `/api/info`.
- Applied by the `tabletop` plugin to `/api/tabletop/*` and `/tabletop/media`; `/api/tabletop/config/*` additionally needs `requireMasterToken`. `/tabletop/proxy-image` checks its token itself. Saving games needs any valid token; only games under `saved/` can be overwritten, and deleting one needs `allowSongDeletion` (or the master token). Named table states (`/api/tabletop/saves`) can be listed and loaded with any token; storing one needs `allowTabletopSaves`, and only the key that stored it may overwrite or delete it (the master token may also delete). `PUT/DELETE /api/tabletop/games/:id/template` needs `allowTabletopTemplates`. Checks use `hasPermission` from `server/src/core/auth.ts`.
- Song-folder files (#568, `routes/songFiles.ts`) are addressed by song id and a file name the scan found, never by path, and the song folder must lie in a library directory. Creating songs, uploading scores or recordings, labels and marks need any valid token; deleting a file or a song needs `allowSongDeletion` (or the master token). The old Notes library migration (`/api/notes/migration`) can be read with any token; running it or removing the originals (`run`, `confirm`) needs `requireMasterToken`. `/api/notes/pieces*` and `/notes/media/*` no longer exist.
- Matches against the master `config.token` (which grants full permissions) or a valid API key in `config.apiKeys`.
- Returns `401 Unauthorized` if missing or mismatched.
- Management routes in `routes/config.ts` additionally use `requireMasterToken` (master token or API key with `allowManagement: true`; else `403`). Song deletion checks `allowSongDeletion`.

### 3a. One-time pairing (#148)

So the user never copies a token, the server pairs the app with a one-time code (`server/src/core/pairing.ts`, `PairingStore`):

- On every start `server/src/index.ts` issues a code and prints `<APP_URL>/settings?tab=server&pair=http://localhost:<port>&code=<code>` (`APP_URL` env, default `https://nexumia.de`). On the first start (`serverConfig.isFirstRun`: the token was just generated) it also opens that URL in the default browser, unless `NO_BROWSER=true`, `CI` is set or `/.dockerenv` exists.
- `POST /api/pair` (public) takes `{ code, name? }`. A valid code creates an API key named `Paired: <device>` with `allowManagement`, `allowTabletopSaves` and `allowTabletopTemplates` (the owner's own app; revoke it like any key) and returns `{ token, keyId, name }` with `Cache-Control: no-store`. Wrong, used or expired codes get `401`.
- Codes: 24 hex chars, in memory only, single use, TTL 10 minutes, at most one live code (a new one replaces the old). Failed redemptions are limited to 5 per minute per remote address (`429`, also for the right code while limited).
- `POST /api/pair/code` (`requireMasterToken`) issues a fresh code, e.g. to pair another device.
- Client: `src/lib/companion/serverPairing.ts` parses the link, redeems the code and stores URL and key via `companionSettings`; `ServerPairingCard` in Settings → Server asks for confirmation first (shows the server URL, since a foreign link could point at someone else's server) and removes `pair`/`code` from the URL afterwards. If the server cannot be reached it shows the mixed-content hint (https page → http LAN server) or suggests opening the server URL once in a new tab (certificate warning of a self-signed proxy).

For clients and guests that should not have unrestricted master access, the server supports granular API keys:

Each API key contains:

- `id`: Unique identifier
- `name`: Display label (e.g., "Living Room TV")
- `token`: Bearer authentication token
- `allowManagement`: Boolean indicating whether the key can manage server settings and keys
- `allowSongDeletion`: Boolean indicating whether the key can delete songs
- `allowTabletopSaves`: Boolean, store named tabletop table states on the server (missing = false)
- `allowTabletopTemplates`: Boolean, replace a tabletop game's default template (missing = false)
- `createdAt`: ISO timestamp

API keys are passed via the standard `Authorization: Bearer <token>` header and validated in `requireAuth` and `requireMasterToken`. The master token and keys with `allowManagement` hold every capability (`hasPermission`). `GET /api/tabletop/status` and `GET /api/tabletop/saves` report the caller's tabletop rights as `permissions: { saveStates, saveTemplates }`.

---

## 5. CORS and Private Network Access

`server/src/core/app.ts`:

- Every response carries `Access-Control-Allow-Private-Network: true` (Chrome PNA preflights from public origins to LAN IPs).
- `allowedOrigins` comes from env `ALLOWED_ORIGINS` (comma list). If it is unset, empty or contains `*`, the request origin is **reflected** (any origin allowed).
- Otherwise listed origins are allowed **plus always** `http(s)://localhost|127.0.0.1[:port]` and RFC 1918 addresses (`192.168.*`, `10.*`, `172.16–31.*`).
- Methods `GET POST PUT DELETE OPTIONS`; headers `Content-Type, Authorization, X-Requested-With`; `maxAge` 86400.

CORS only restricts browsers. It is not access control — tokens are.

## 6. Known gaps

- The in-memory room relay (`/api/relay/rooms/*`) has no auth. It holds no files or secrets and no frontend code calls it; it also runs in the token-less Workers entry (`server/src/worker.ts`).
- Tokens travel in query strings (`?token=`) for media URLs, so they end up in logs and browser history. Since PR #394 these URLs carry the **caller's** token (`getRequestToken`), never the master token.
- The server is meant for trusted LANs. Exposing it through the tunnel publishes every route to the internet.

History: until PR #394 (2026-10-18) the tabletop plugin had no auth, `/tabletop/media` accepted token-less requests and `/raw` and `/api/songs` embedded the master token in URLs.
