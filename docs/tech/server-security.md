# Server Security Model & Authentication

> [!CAUTION]
> This document contains descriptions of security-sensitive flows. Never commit real tokens, private keys, or certificates to the repository. See [secrets-management.md](file:///home/deck/Projects/LocalGameGalaxy/docs/tech/secrets-management.md) for configuration setup.

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
│  • Modular Hono plugins (Melodiq, WebRTC Relay)          │
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

The token is stored in `config.json` and loaded at server startup via `server/src/config.ts`. The SPA reads this token from a pairing QR code or direct connection input and stores it in memory for the session.

**Token validation middleware** (`server/src/plugins/melodiq/middleware/auth.ts`):
- Checks `req.headers.authorization` or query parameter for `Bearer <token>`.
- Matches against the master `config.token` (which grants full permissions) or a valid API key in `config.apiKeys`.
- Returns `401 Unauthorized` if missing or mismatched.
- Sensitive admin routes (e.g. server config, key management) require `requireMasterToken` (valid master token or API key with `allowManagement: true`).

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

## 5. CORS Configuration

The server's CORS policy is controlled by the `ALLOWED_ORIGINS` environment variable (or defaults):

| Environment | Allowed Origins |
|-------------|-----------------|
| Development | All origins (`*`) |
| Production  | Explicitly listed origins (e.g., `https://nexumia.de`) |

