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
  at: 2026-10-18
  method: 'read wrangler.jsonc, capacitor.config.ts, android/app/build.gradle, server/Dockerfile, server/docker-compose*.yml, .github/workflows/{ci,release,docker-publish,deploy-push-relay}.yml, server/package.json'
sources:
  - 'wrangler.jsonc'
  - 'capacitor.config.ts'
  - 'server/Dockerfile'
  - '.github/workflows/release.yml'
---

# Deployment and packaging

## 1. Artifacts at a glance

| Artifact                          | Built by                                                                       | Shipped to                                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Web SPA + PWA                     | `npm run build` → `dist/`                                                      | Cloudflare Workers static assets `nexumia` (`ci.yml` → `deploy-cloudflare`): `main` = production (`nexumia.de`), PRs = preview with bot comment |
| Android APK `nexumia.apk`         | `release.yml` → `build-android`                                                | GitHub Release asset                                                                                                                            |
| Companion server image            | `docker-publish.yml` (targets `base`, `full`)                                  | Docker Hub `<user>/nexumia-server`, `<user>/melodiq-server`                                                                                     |
| Server binaries (Linux/Win/macOS) | `release.yml` → `build-server-binaries`                                        | **broken** — see §4c                                                                                                                            |
| Push relay worker                 | `deploy-push-relay.yml` (`wrangler deploy` in `server/cloudflare-push-relay/`) | Cloudflare Workers                                                                                                                              |
| Signaling tracker                 | `signaling/Dockerfile`                                                         | image `nexumia/galaxy-signaling` (no publish workflow in this repo — **Unverified** where it is built)                                          |

CI details and secrets: [workflows/ci-cd-pipelines.md](../workflows/ci-cd-pipelines.md).

## 2. Web SPA

```bash
npm run build      # tsc -b && vite build → dist/
npm run preview    # serve dist/ locally
```

- `wrangler.jsonc`: worker `nexumia`, assets from `./dist`, `not_found_handling: "single-page-application"` (deep links fall back to `index.html`).
- `vite-plugin-pwa` generates the service worker; `public/sw-push.js` adds push handling.
- `dist/` can be served by any static host; the companion server does **not** serve it.

## 3. Android (Capacitor)

`capacitor.config.ts`: `appId` `com.localgamegalaxy.melodiq`, `appName` `Nexumia`, `webDir` `dist`, plugins `SplashScreen`, `StatusBar`; safe areas via `capacitor-plugin-safe-area` (see [styling](styling.md)). `android/app/build.gradle`: `versionName` `1.1.0`, `versionCode` 2.

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug        # local; needs Android SDK (android/local.properties → sdk.dir)
```

Release signing (CI): secret `ANDROID_KEYSTORE_BASE64` is decoded to `android/app/release.jks`; `build.gradle` signs with it when `ANDROID_KEYSTORE_PASSWORD` is set (`ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` optional). Without the secret CI builds `assembleDebug`. Keystores (`*.jks`, `*.keystore`, `*.p12`, `keystore.properties`) are blocked by `scripts/check-repo-hygiene.mjs`. Runbook: [operations/android-release.md](../operations/android-release.md).

## 4. Companion server

### 4a. Node process

```bash
npm run host                 # = cd server && npm start → node dist/index.js (build first: cd server && npm run build)
cd server && npm run build   # tsc
```

Env: see [architecture §3.6](architecture.md#36-companion-server-server-optional). Tunnel: `ENABLE_TUNNEL=true` or `--tunnel` (needs `cloudflared`).

### 4b. Docker

`server/Dockerfile` stages: `builder` (tsc), `base` (`node:20-slim` + ffmpeg, python3, `yt-dlp`; port 3000), `full` (`base` + CPU PyTorch, `audio-separator`, `whisper-timestamped` for separation/alignment).

| Compose file                       | Purpose                                                                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `server/docker-compose.yml`        | signaling (8000) + server (3000) + optional `cloudflared`; `SECURITY_TOKEN=` empty → auto-generated                                 |
| `server/docker-compose.dev.yml`    | local build, containers `melodiq-server-dev`, `galaxy-signaling-dev` — [dev-compose-workflow](../workflows/dev-compose-workflow.md) |
| `server/docker-compose.ai.yml`     | `nexumia/melodiq-server:ai` image variant                                                                                           |
| `server/docker-compose.tunnel.yml` | server + Cloudflare tunnel                                                                                                          |

The Settings UI can generate a compose file (`src/features/settings/components/server/composeYamlGenerator.ts`).

Node version drift (`node:20-slim` vs Node 24 elsewhere): [open-questions Q10](../open-questions.md#q10--node-version-drift).

### 4c. Standalone binaries (currently broken)

`release.yml` runs `npm run package` in `server/` and expects `server/dist/nexumia-server-{linux,win.exe,macos}` plus launchers from `server/release-scripts/` (`start-server.sh`, `NexumiaServer.desktop`, `start-server.bat`, `start-server.command`). `server/package.json` has **no `package` script** since 2026-09-13, so this job fails. Fix pending in PR #394. → [open-questions Q1](../open-questions.md#q1--release-pipeline-calls-a-script-that-no-longer-exists)

## 5. Signaling tracker

```bash
npm run tracker                      # scripts/start-tracker.js → signaling/src/index.js
cd signaling && docker compose up    # image nexumia/galaxy-signaling
```

Runbook: [operations/webrtc-tracker.md](../operations/webrtc-tracker.md).
