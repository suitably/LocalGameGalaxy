---
type: Deployment Specification
title: Deployment Architecture & Multi-Platform Packaging
description: Deployment targets including SPA web hosting, Android packaging via Capacitor, and Dockerized companion backend.
resource: server/Dockerfile
tags: [deployment, capacitor, docker, cloudflare, pwa]
status: stable
generated: { by: antigravity/2.0, at: 2026-09-27T10:00:00Z }
verified: { by: process:ci, at: 2026-09-27T10:00:00Z }
---

# Deployment Architecture & Multi-Platform Packaging

---

## 1. Deployment Modes Overview

LocalGameGalaxy supports three distinct deployment/packaging configurations:

| Mode | Target Platform | Entry Point |
|------|-----------------|-------------|
| **Web (Vite dev/build)** | Any browser on local network | `npm run dev` / `npm run build` |
| **Android App (Capacitor)** | Android phones, Android TV | `npx cap build android` |
| **Companion Server (Node)** | Linux / macOS / Windows | `npm run host` or standalone binary |

---

## 2. Frontend: Vite Build & Static Hosting

The React SPA is built with Vite:
```bash
npm run build       # Outputs to dist/
```
The `dist/` folder can be served from any static web host or HTTPS server. In production, it is typically hosted via the companion server's Express static middleware or a CDN.

A **PWA Service Worker** (`vite-plugin-pwa`) is generated automatically, enabling offline caching of app assets.

---

## 3. Android App: Capacitor

The SPA is wrapped as a native Android APK using Capacitor.

### Build Process
```bash
npm run build           # 1. Build the web bundle
npx cap sync            # 2. Copy web assets to android/ native project
npx cap build android   # 3. Build the signed APK via Gradle
```

### Capacitor Configuration (`capacitor.config.ts`)
- **App ID**: Defined in `capacitor.config.ts`
- **Server URL**: In development, Capacitor can proxy to `http://localhost:5173`. In production the bundled assets are used directly.
- **Plugins**: `StatusBar`, `SplashScreen`, `SafeArea`

### Edge-to-Edge Display
Android API 35+ enforces edge-to-edge rendering. The app uses `capacitor-plugin-safe-area` CSS variables (`var(--safe-area-inset-top)`) in the root layout to offset content from system bars. See [styling.md](docs/tech/styling.md) for details.

---

## 4. Companion Server: Docker & Standalone Binaries

The companion server (`/server`) supports three distribution modes:

### 4a. Local Node.js (Development)
```bash
cd server && npm start
```

### 4b. Docker
```bash
# Production
cd server && docker compose up

# Development (local build, no image pull)
cd server && docker compose -f docker-compose.dev.yml up --build
```
See [dev-compose-workflow.md](docs/workflows/dev-compose-workflow.md) for details.

### 4c. Standalone Native Binaries (`pkg`)
The server can be compiled into self-contained executables using `pkg`:
```bash
cd server && npm run package
# Outputs to server/dist/:
#   melodiq-server-linux
#   melodiq-server-win.exe
#   melodiq-server-macos
```
Target architectures are defined in `server/package.json` under `pkg.targets`. Release scripts live in `server/release-scripts/`.

> [!NOTE]
> Standalone binaries bundle Node.js runtime and all dependencies. They are ideal for end-user distribution on systems without Node.js installed.

---

## 5. Automated CI/CD Pipelines & Cloud Deployment

All deployments and binary releases are automated via GitHub Actions pipelines. See the dedicated [CI/CD Pipelines Documentation](file:///home/carsten/LocalGameGalaxy/docs/workflows/ci-cd-pipelines.md) for full architecture details:

| Target / Artifact | Workflow File | Trigger | Output |
| :--- | :--- | :--- | :--- |
| **Web SPA (Prod & Preview)** | `.github/workflows/ci.yml` | Push / PR to `main` | Production at `nexumia.de`, preview deployments for PRs |
| **Cloudflare Preview Cleanup** | [`.github/workflows/cleanup-preview.yml`](file:///.github/workflows/cleanup-preview.yml) | `pull_request` (`closed`), `workflow_dispatch` | Deletes obsolete preview branches & environments |
| **Push Relay Worker** | `.github/workflows/deploy-push-relay.yml` | Push to `server/cloudflare-push-relay/**` | Cloudflare Worker for Web Push & ntfy relay |
| **Docker Images** | `.github/workflows/docker-publish.yml` | Push to `server/**` or tag `v*` | Hub images: `base` (~200MB) & `full` (~2GB, AI Demucs) |
| **Android APK** | `.github/workflows/build-apk.yml` | Tag `v*` / GitHub Release | Attached `nexumia.apk` on release |
| **Standalone Binaries** | `.github/workflows/release_helper.yml` | Tag `v*` / GitHub Release | Linux, Windows, and macOS packaged archives on release |

