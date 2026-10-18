---
type: Howto
title: 'Companion server runbook'
description: 'Start, stop and update the companion server (Docker Compose or Node), where its files live, how to rotate the master token and API keys, how to restrict CORS, and how to publish it over HTTPS.'
tags: [operations, server, docker, token, cors, runbook]
status: stable
generated:
  at: 2026-10-18T15:00:00+02:00
  by: claude-code
verified:
  at: 2026-10-18
  method: 'read server/docker-compose*.yml, server/src/config.ts, server/src/core/app.ts, server/src/plugins/melodiq/routes/config.ts; commands not executed'
sources:
  - 'server/docker-compose.yml'
  - 'server/src/config.ts'
  - 'merged from: previous version of 2026-09-27'
---

# Companion server runbook

Read [server-security §6](../tech/server-security.md#6-known-gaps) before exposing the server beyond a trusted LAN.

## 1. Files and ports

| What      | Where                                                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Config    | `config.json` (lookup: `CONFIG_PATH`, `/app/config`, cwd, executable dir — [secrets-management §2](../tech/secrets-management.md#2-server-configjson)) |
| Playlists | `playlists.json` next to the config; `/app/config/playlists.json` in Docker                                                                            |
| Songs     | configured `directories` / `MUSIC_DIR`; downloads into `downloadDir`                                                                                   |
| Models    | `MODELS_DIR` or `<cwd>/models`                                                                                                                         |
| Ports     | server 3000, signaling tracker 8000                                                                                                                    |
| Health    | `GET http://<host>:3000/health`, `GET http://<host>:8000/health`                                                                                       |

## 2. Start, stop, update

```bash
cd server
docker compose up -d                       # signaling + server (+ optional cloudflared)
docker compose logs -f melodiq-server
docker compose down
docker compose pull && docker compose up -d   # update to the latest published image
docker compose -f docker-compose.dev.yml up -d --build   # local build, see workflows/dev-compose-workflow.md
```

Without Docker: `cd server && npm ci && npm run build && npm start` (or `npm run host` from the repo root).

Restarts drop WebRTC/WebSocket clients for a moment; phones reconnect automatically (see [webrtc-signaling §4](../tech/webrtc-signaling.md#4-reconnection-and-resiliency)).

## 3. Rotating the master token

1. Generate: `openssl rand -hex 16`.
2. Set it — either `token` in `config.json`, or `SECURITY_TOKEN=<new>` in the compose file / environment (env wins).
3. Restart: `docker compose restart melodiq-server` (or restart the Node process).
4. Verify: `curl -H "Authorization: Bearer <new>" http://localhost:3000/api/auth/me` → `200`; the old token → `401`.
5. Re-pair clients (QR code / settings); until then they get `401`.

To force a fresh random token, clear `token` in `config.json` and unset `SECURITY_TOKEN`; the server generates and saves a new one at start.

### API keys

`GET/POST /api/config/apikeys`, `PUT/DELETE /api/config/apikeys/:id` (master token or key with `allowManagement`). Revoke a key by deleting it; no restart needed.

## 4. Restricting CORS

Set `ALLOWED_ORIGINS` (comma-separated) in the environment, e.g. `ALLOWED_ORIGINS=https://nexumia.de`. Unset/empty/`*` reflects any origin. localhost and private-network origins are always allowed. Behaviour: [server-security §5](../tech/server-security.md#5-cors-and-private-network-access).

## 5. HTTPS

The server has no TLS. Options: Cloudflare Quick Tunnel (`ENABLE_TUNNEL=true`, or the `cloudflared` service in `docker-compose.yml`), or a reverse proxy with a certificate in front of ports 3000 and 8000 (tracker example: [webrtc-tracker §4](webrtc-tracker.md#4-security--mixed-content-restrictions)).
