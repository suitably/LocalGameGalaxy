# Deployment Architecture & Multi-Platform Packaging [ID: TECH-DEPLOYMENT]

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
Android API 35+ enforces edge-to-edge rendering. The app uses `capacitor-plugin-safe-area` CSS variables (`var(--safe-area-inset-top)`) in the root layout to offset content from system bars. See [styling.md](file:///home/deck/Projects/LocalGameGalaxy/docs/tech/styling.md) for details.

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
See [dev-compose-workflow.md](file:///home/deck/Projects/LocalGameGalaxy/docs/workflows/dev-compose-workflow.md) for details.

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
