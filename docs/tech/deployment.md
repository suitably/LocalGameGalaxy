---
type: Reference
title: 'Deployment and packaging'
description: 'How each artifact is built and shipped: the SPA on Cloudflare Workers static assets, the Capacitor Android APK, the companion server as Node process or Docker image (base/full), the push relay worker, the signaling tracker, and the currently broken standalone server binaries.'
tags: [deployment, cloudflare, capacitor, android, docker, pwa]
status: stable
generated:
  at: 2026-10-18T15:00:00+02:00
  by: claude-code
verified:
  at: 2026-10-25
  method: 'read wrangler.jsonc, capacitor.config.ts, android/app/build.gradle, server/Dockerfile, server/docker-compose*.yml, .github/workflows/{ci,release,docker-publish,deploy-push-relay}.yml, server/package.json'
sources:
  - 'wrangler.jsonc'
  - 'capacitor.config.ts'
  - 'server/Dockerfile'
  - '.github/workflows/release.yml'
---

# Deployment and packaging

## 1. Artifacts at a glance

| Artifact                          | Built by                                                                       | Shipped to                                                                                                                                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web SPA + PWA                     | `npm run build` → `dist/`                                                      | Cloudflare Workers static assets `nexumia` (`ci.yml` → `deploy-cloudflare`): `main` = production (`nexumia.de`), PRs = preview with bot comment                                                                                                    |
| Android APK `nexumia.apk`         | `release.yml` → `build-android`                                                | GitHub Release asset                                                                                                                                                                                                                               |
| Companion server image            | `docker-publish.yml` (targets `base`, `full`)                                  | Docker Hub `nexumia/nexumia-server` and `ghcr.io/suitably/nexumia-server`, with provenance (old alias `nexumia/melodiq-server` ends at 1.2.0)                                                                                                      |
| Server binaries (Linux/Win/macOS) | `release.yml` → `build-server-binaries`                                        | GitHub Release assets — see §4c                                                                                                                                                                                                                    |
| Push relay worker                 | `deploy-push-relay.yml` (`wrangler deploy` in `server/cloudflare-push-relay/`) | Cloudflare Workers                                                                                                                                                                                                                                 |
| Signaling tracker                 | `signaling/Dockerfile`                                                         | image `nexumia/galaxy-signaling` (fixed namespace, matches the compose files; also `ghcr.io/suitably/galaxy-signaling`), built and pushed by `docker-publish.yml` → `build-and-push-signaling` (on `signaling/**` changes on main and in releases) |

CI details and secrets: [workflows/ci-cd-pipelines.md](../workflows/ci-cd-pipelines.md).

## 2. Web SPA

```bash
npm run build      # tsc -b && vite build → dist/
npm run preview    # serve dist/ locally
```

- `wrangler.jsonc`: worker `nexumia`, assets from `./dist`, `not_found_handling: "single-page-application"` (deep links fall back to `index.html`). Only `/api/steam/*` and `/api/push/*` run worker code first (`run_worker_first`): `cloudflare/worker.ts` proxies Steam's `GetPublishedFileDetails` (only a numeric Workshop id is forwarded) and `GET /api/steam/file?url=` downloads from Steam's user-content CDN (allow-listed hosts, 60 MB limit), so Workshop import works without a companion server. `/api/push/*` is the stateless Web Push sender (`cloudflare/webPushSend.ts`, crypto in `cloudflare/webPush.ts`, see [sync-protocol §5](sync-protocol.md#5-web-push-and-ntfy)); it needs the worker secrets `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` (optional `VAPID_SUBJECT`, default the site origin), created with `node scripts/generate-vapid-keys.mjs` and stored with `npx wrangler secret put …` or in the Cloudflare dashboard (worker `nexumia` → Settings → Variables and Secrets). Without them `/api/push/*` answers 503 and devices fall back to ntfy. No storage; everything else is plain static assets.
- `vite-plugin-pwa` generates the service worker; `public/sw-push.js` adds push handling.
- `dist/` can be served by any static host; the companion server does **not** serve it.

## 3. Android (Capacitor)

`capacitor.config.ts`: `appId` `com.localgamegalaxy.melodiq`, `appName` `Nexumia`, `webDir` `dist`, plugins `SplashScreen`, `StatusBar`; safe areas via `capacitor-plugin-safe-area` (see [styling](styling.md)). `android/app/build.gradle`: `versionName` `1.1.0`, `versionCode` 2.

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug        # local; needs Android SDK (android/local.properties → sdk.dir)
```

Release signing (CI): secret `ANDROID_KEYSTORE_BASE64` is decoded to `android/app/release.jks`; `build.gradle` signs with it when `ANDROID_KEYSTORE_PASSWORD` is set (`ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` optional). Without the secret a tag release fails (#590); a manual run (`workflow_dispatch`) builds `nexumia-debug.apk` as a workflow artifact only, never as a release asset. Keystores (`*.jks`, `*.keystore`, `*.p12`, `keystore.properties`) are blocked by `scripts/check-repo-hygiene.mjs`. Runbook: [operations/android-release.md](../operations/android-release.md).

## 4. Companion server

### 4a. Node process

```bash
npm run host                 # = cd server && npm start → node dist/index.js (build first: cd server && npm run build)
cd server && npm run build   # tsc
```

Env: see [architecture §3.6](architecture.md#36-companion-server-server-optional). Tunnel: `ENABLE_TUNNEL=true` or `--tunnel` (needs `cloudflared`).

### 4b. Docker

`server/Dockerfile` stages: `builder` (tsc), `base` (`node:24-slim` + ffmpeg, python3, `yt-dlp`; port 3000), `full` (`base` + CPU PyTorch, `audio-separator`, `whisper-timestamped` for separation/alignment). One volume per plugin: `/app/config`, `/app/music` + `/app/models` (melodiq), `/app/tabletop` (tabletop, saved games in `saved/`), `/app/notes` (notes); `PLUGINS` defaults to all four.

| Compose file                    | Purpose                                                                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `server/docker-compose.yml`     | signaling (8000) + server (3000) + optional `cloudflared`; `SECURITY_TOKEN=` empty → auto-generated                               |
| `server/docker-compose.dev.yml` | local build, services `nexumia-server-dev`, `galaxy-signaling-dev` — [dev-compose-workflow](../workflows/dev-compose-workflow.md) |

All server setup lives in one place, the setup wizard (`src/components/connection/ServerSetupWizard.tsx`, opened by "Set up or adjust server" in Settings → Server and next to the connection fields). Its Docker tab is the only compose generator (`src/components/connection/setup/compose/composeYamlGenerator.ts`, state in `useComposeGenerator.ts`, choices kept in `STORAGE_KEYS.COMPOSE_GENERATOR` without the token): the signaling tracker (optional, own port) plus one companion container (`nexumia/nexumia-server`, `:full` when the AI image is chosen) whose `PLUGINS` and volumes follow the selected games (Melodiq, Melodiq Notes, Tabletop), with host folders and server port, the wizard's token, and an optional Cloudflare quick tunnel. It downloads the file and can point this device at `http://localhost:<port>` with that token. The other tabs (server app, Cloudflare, terminal one-liner) use the same token. `server/docker-compose.ai.yml` and `docker-compose.tunnel.yml` were removed: they pulled a non-existent `:ai` tag and mounted the music folder read-only. There are no separate tabletop or push containers: tabletop is a server plugin, push runs via ntfy or the Cloudflare worker. The standalone tracker stays because the companion server has no WebSocket tracker of its own (#342).

The Dockerfile uses Node 24 like the rest of the repo (was Q10).

### 4c. Standalone binaries

```bash
cd server
npm run bundle     # esbuild src/index.ts → dist/nexumia-server.cjs (CJS bundle; needed because music-metadata 12 is ESM-only)
npm run package    # bundle + @yao-pkg/pkg → dist/nexumia-server-{linux,win.exe,macos} (node24-*-x64)
```

`release.yml` → `build-server-binaries` runs `npm run package` (x64) and packs each binary with its launcher from `server/release-scripts/` (`start-server.sh` + `NexumiaServer.desktop`, `start-server.bat`, `start-server.command`) and `scripts/align_lyrics.py`. The launchers `cd` into their folder, so the binary finds `config.json`, `scripts/` and the empty data folders `music/`, `tabletop/`, `notes/` there. `build-server-binaries-arm64` builds `nexumia-server-{linux,macos}-arm64.tar.gz` natively on `ubuntu-24.04-arm` and `macos-15` (pkg cannot cross-compile bytecode); the binary keeps the x64 file name so the launchers work unchanged. `quick-install.sh` picks the ARM archive from `uname -m`; the setup dialog's binary tab links it for macOS and Linux. **Unverified:** the ARM jobs have not run yet. Separation/alignment still need Python and `ffmpeg` on the host.

First start without `config.json`: the server generates its token, prints a one-time pairing link and opens it in the browser, which pairs the app automatically (Settings → Server, [server-security §3a](server-security.md#3a-one-time-pairing-148)). Melodiq's "set up server" button opens Settings → Server with the setup wizard (`section=setup`), whose binary tab detects the OS and links the matching release archive.

Restored in PR #394 (the `package` script had been removed on 2026-09-13). Only the Linux binary was smoke-tested.

## 5. Signaling tracker

```bash
npm run tracker                      # scripts/start-tracker.js → signaling/src/index.js
cd signaling && docker compose up    # image nexumia/galaxy-signaling
```

Runbook: [operations/webrtc-tracker.md](../operations/webrtc-tracker.md).
