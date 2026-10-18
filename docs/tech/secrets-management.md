---
type: Howto
title: 'Secrets and local configuration'
description: 'Where secrets live (server config.json, env vars, browser storage, CI secrets), how the server token is created and rotated, and how to get HTTPS for phones now that the server has no built-in TLS.'
tags: [secrets, config, token, https, tunnel]
status: stable
generated:
  at: 2026-10-18T15:00:00+02:00
  by: claude-code
verified:
  at: 2026-10-18
  method: 'read server/src/config.ts, server/config.example.json, server/src/core/tunnel.ts, src/lib/storage.ts, src/lib/github.ts'
sources:
  - 'server/src/config.ts'
  - 'server/config.example.json'
---

# Secrets and local configuration

## 1. Inventory

| Secret                                               | Where it lives                                                                                      | Never commit                                                                           |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Server master token                                  | `config.json` → `token`, or env `SECURITY_TOKEN` / `TOKEN`                                          | `config.json` is git-ignored                                                           |
| Server API keys                                      | `config.json` → `apiKeys[]` (created via `POST /api/config/apikeys`)                                | same                                                                                   |
| USDB login                                           | `config.json` → `usdbUsername`, `usdbPassword`                                                      | same                                                                                   |
| GitHub token for server-side publishing              | `config.json` → `githubToken`                                                                       | same                                                                                   |
| Browser-side helper token                            | `STORAGE_KEYS.HELPER_TOKEN` (localStorage)                                                          | —                                                                                      |
| GitHub PAT for in-app PR publishing                  | `STORAGE_KEYS.GITHUB_TOKEN` (localStorage; see the security note in `src/lib/github.ts`)            | —                                                                                      |
| Android keystore, Cloudflare, Docker Hub, Jules keys | GitHub Actions secrets ([ci-cd §4](../workflows/ci-cd-pipelines.md#4-repository-secrets-reference)) | `*.jks`, `*.keystore`, `*.p12`, `keystore.properties` are blocked by the hygiene check |

`scripts/check-repo-hygiene.mjs` also scans tracked text files (outside `docs/` and `*.example.*`) for secret patterns.

## 2. Server `config.json`

Lookup order (`server/src/config.ts`): `CONFIG_PATH` → current working directory → directory of the executable → its parent. If none exists the server starts with defaults and writes the file when settings change.

Start from the example:

```bash
cd server && cp config.example.json config.json
```

```json
{ "directories": ["/path/to/music/folder"], "port": 3000, "token": "YOUR_SECURE_TOKEN_HERE" }
```

Other keys the server understands (defaults in `defaultConfig`): `tabletopDirectories`, `downloadDir`, `usdbUsername`, `usdbPassword`, `apiKeys`, `defaultDownloadMode` (`stream`), `autoVocalSeparation` (`false`), `githubOwner` (`suitably`), `githubRepo` (`LocalGameGalaxy`), `githubToken`.

> The repo-root `config.example.json` (with an `ssl` block) is obsolete — [open-questions Q5](../open-questions.md#q5--root-configexamplejson-is-obsolete).

## 3. Token

- Empty or missing token → the server generates `crypto.randomBytes(16).toString('hex')` at start-up and persists it.
- Generate one yourself: `openssl rand -hex 16`.
- Env (`SECURITY_TOKEN`, then `TOKEN`) overrides `config.json`; surrounding quotes are stripped.
- Rotation: [operations/server-runbook §3](../operations/server-runbook.md#3-rotating-the-master-token).

## 4. HTTPS for phones

Microphone, WebRTC and service workers need a secure context; `http://localhost` counts as secure, a LAN IP does not. The server only speaks plain HTTP, so use one of:

1. **Cloudflare Quick Tunnel** — `ENABLE_TUNNEL=true` or `npm start -- --tunnel` in `server/` (needs `cloudflared`), or the `cloudflared` service in `server/docker-compose.yml`. Prints a temporary `https://*.trycloudflare.com` URL.
2. **Reverse proxy** with a real certificate (Caddy, Traefik, Nginx) in front of port 3000 and the tracker on 8000.
3. **Hosted SPA** (`https://nexumia.de`) talking to the local server: the server sends `Access-Control-Allow-Private-Network: true`, but browsers still block `http://` fetches from an `https://` page (mixed content) — a tunnel or proxy is required for the server URL as well.

Self-signed certificates for the Vite dev server are not configured (`vite.config.ts` has no `https` option).
