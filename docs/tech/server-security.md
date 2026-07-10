# Server Security Model & Authentication [ID: TECH-SERVER-SECURITY]

> [!CAUTION]
> This document contains descriptions of security-sensitive flows. Never commit real tokens, private keys, or certificates to the repository. See [secrets-management.md](file:///home/deck/Projects/LocalGameGalaxy/docs/tech/secrets-management.md) for configuration setup.

---

## 1. Overview

The Melodiq Helper Server implements a multi-layer security model designed for trusted local-network use. It is **not** designed for public internet exposure without additional hardening.

```
┌──────────────────────────────────────────────────────────┐
│  React SPA (Phone / Host / TV)                           │
│                                                          │
│  1. HTTPS (TLS) ──► Encrypted transport                  │
│  2. Authorization: Bearer <token> ──► Master token auth  │
│  3. X-Api-Key: <key> ──► Optional API key (rate bypass)  │
└────────────────────────┬─────────────────────────────────┘
                         │ Local Network (HTTPS/WSS)
                         ▼
┌──────────────────────────────────────────────────────────┐
│  Melodiq Helper Server (Node.js / Express)               │
│                                                          │
│  • Helmet.js (security headers)                          │
│  • CORS allowlist                                        │
│  • express-rate-limit (per-IP + global)                  │
│  • Token middleware (Bearer auth)                        │
│  • Optional API key bypass for trusted clients           │
└──────────────────────────────────────────────────────────┘
```

---

## 2. TLS / Self-Signed SSL Certificates

All communication between the SPA and the server happens over **HTTPS/WSS** using a self-signed RSA certificate. This is required because:

1. The Web Audio API and WebRTC require a **Secure Context** (`https://` or `localhost`).
2. When the SPA is accessed from a phone on the local network (not `localhost`), a valid HTTPS connection to the server is mandatory.

The SSL key and certificate are stored directly in `config.json` (as PEM strings). They are loaded at server startup via `config.js`:

```javascript
// server/config.js (simplified)
const ssl = {
  key: config.ssl.key,   // RSA Private Key PEM
  cert: config.ssl.cert, // Self-signed Certificate PEM
};
https.createServer(ssl, app).listen(port);
```

**Generating new certificates**: See [secrets-management.md](file:///home/deck/Projects/LocalGameGalaxy/docs/tech/secrets-management.md#3-generating-self-signed-ssl-certificates).

---

## 3. Master Security Token

Every authenticated API request from the SPA to the server must include a **Bearer token** in the `Authorization` header:

```
Authorization: Bearer <token>
```

The token is stored in `config.json` and loaded at server startup. The SPA reads this token from a `/api/token` bootstrap endpoint (or via QR code scanning at pairing time) and stores it in memory for the session.

**Token validation middleware** (`server/src/middleware/auth.js`):
- Checks `req.headers.authorization` for `Bearer <token>`.
- Returns `401 Unauthorized` if missing or mismatched.
- Applied to all sensitive routes (song management, separator trigger, etc.).

---

## 4. API Key System

For trusted clients that need to bypass rate limiting (e.g., a local automation script or CI runner), the server supports an additional `X-Api-Key` header:

```
X-Api-Key: <api-key>
```

API keys are stored as an allowlist in `config.json`. A matching key bypasses `express-rate-limit` but still requires the master Bearer token for authentication.

---

## 5. CORS Configuration

The server's CORS policy is controlled by the `ALLOWED_ORIGINS` environment variable (or defaults):

| Environment | Allowed Origins |
|-------------|-----------------|
| Development | All origins (`*`) |
| Production  | Explicitly listed origins (e.g., `https://nexumia.de`) |

---

## 6. Rate Limiting

`express-rate-limit` is applied globally and on sensitive endpoints:
- **Global**: 100 requests / 15 minutes per IP
- **Separator endpoint** (`POST /api/separate`): 5 requests / hour (CPU-intensive)
- **API key holders**: Rate limiting bypassed
