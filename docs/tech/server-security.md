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
  at: 2026-10-18
  method: 'read server/src/core/app.ts, server/src/plugins/melodiq/{index.ts,middleware/auth.ts}, server/src/plugins/tabletop/routes/*.ts, server/src/plugins/relay/index.ts, server/src/utils/helpers.ts'
sources:
  - 'server/src/plugins/melodiq/middleware/auth.ts'
  - 'server/src/core/app.ts'
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

The token is stored in `config.json` and loaded at server startup via `server/src/config.ts`. The SPA gets the token from a pairing QR code or manual input and keeps it in `localStorage` (`STORAGE_KEYS.HELPER_TOKEN`) until changed.

**Token validation middleware** (`server/src/plugins/melodiq/middleware/auth.ts`):

- Reads `Authorization: Bearer <token>` or the `?token=` query parameter.
- Applied by the `melodiq` plugin to: `/api/songs*`, `/api/status`, `/api/auth/me`, `/media`, `/api/usdb/*`, `/api/youtube/*`, `/api/separator/*`, `/api/config/*`, `/api/playlists*`, `/api/browse`, `/api/feedback` (`server/src/plugins/melodiq/index.ts`). Public: `/health`, `/api/info`.
- Matches against the master `config.token` (which grants full permissions) or a valid API key in `config.apiKeys`.
- Returns `401 Unauthorized` if missing or mismatched.
- Management routes in `routes/config.ts` additionally use `requireMasterToken` (master token or API key with `allowManagement: true`; else `403`). Song deletion checks `allowSongDeletion`.

---

## 4. API Key System & Capabilities

For clients and guests that should not have unrestricted master access, the server supports granular API keys:

Each API key contains:

- `id`: Unique identifier
- `name`: Display label (e.g., "Living Room TV")
- `token`: Bearer authentication token
- `allowManagement`: Boolean indicating whether the key can manage server settings and keys
- `allowSongDeletion`: Boolean indicating whether the key can delete songs
- `createdAt`: ISO timestamp

API keys are passed via the standard `Authorization: Bearer <token>` header and validated in `requireAuth` and `requireMasterToken`.

---

## 5. CORS and Private Network Access

`server/src/core/app.ts`:

- Every response carries `Access-Control-Allow-Private-Network: true` (Chrome PNA preflights from public origins to LAN IPs).
- `allowedOrigins` comes from env `ALLOWED_ORIGINS` (comma list). If it is unset, empty or contains `*`, the request origin is **reflected** (any origin allowed).
- Otherwise listed origins are allowed **plus always** `http(s)://localhost|127.0.0.1[:port]` and RFC 1918 addresses (`192.168.*`, `10.*`, `172.16–31.*`).
- Methods `GET POST PUT DELETE OPTIONS`; headers `Content-Type, Authorization, X-Requested-With`; `maxAge` 86400.

CORS only restricts browsers. It is not access control — tokens are.

## 6. Known gaps

- **Tabletop and relay plugins have no auth middleware**, `/tabletop/media` accepts requests without a token, and `/api/tabletop/games/:id/raw` embeds the master token in returned URLs. Together this allows reading files and obtaining the master token without credentials. Details and fix: [open-questions Q0](../open-questions.md#q0--unauthenticated-tabletop-routes-allow-file-reads).
- Tokens travel in query strings (`?token=`) for media URLs, so they end up in logs and browser history.
- The server is meant for trusted LANs. Exposing it through the tunnel publishes all of the above.
