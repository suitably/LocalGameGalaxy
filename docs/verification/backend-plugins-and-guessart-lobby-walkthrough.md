# Backend Modular Micro-Kernel & GuessArt Multiplayer Lobby Walkthrough

## Summary of Changes

### 1. Modular Backend Micro-Kernel & 3 Deployment Targets (`server/`)
- **Core Micro-Kernel (`server/src/core/`)**:
  - Implemented ultra-lightweight Hono application core (`app.ts`), plugin loader (`pluginLoader.ts`), and types (`types.ts`).
  - Implemented zero-config Cloudflare Quick Tunnel provider (`tunnel.ts`) that automatically establishes a secure `https://*.trycloudflare.com` URL without port-forwarding or router logins.
- **Modular Game Plugins (`server/src/plugins/`)**:
  - `relay`: Lightweight room coordinator and WebRTC signaling relay.
  - `melodiq`: Song scanner and audio streaming for Melodiq without heavy dependencies.
- **3 Universal Deployment Targets Supported**:
  1. **Cloudflare Workers** (1-Click free 24/7 cloud deploy via `wrangler.toml` & `worker.ts`).
  2. **1-Click Local Laptop / Standalone Server** (`server/src/index.ts` with `--tunnel`).
  3. **Docker Compose** (`server/docker-compose.yml` with profiles: `core`, `melodiq`, `ai`, `tunnel`).

### 2. GuessArt Interactive Multiplayer Lobby (`src/games/guessart/`)
- **Room Manager (`guessartRoomManager.ts`)**:
  - Handles room lifecycle (`createRoom`, `joinRoom`, `startRoomGame`, `publishRoomState`).
- **Interactive Lobby Component (`GuessArtLobby.tsx`)**:
  - Live player roster with avatar colors and Host badge.
  - Player name input for new guests joining via link.
  - Room Code, copy share link, and QR-Code toggle.
  - Host controls: "Spiel starten" button (active when >= 2 players have joined).
  - Guest waiting state: "Warte auf Spielstart durch den Host...".
- **Lobby Integration (`GuessArtGame.tsx` & `GameSetup.tsx`)**:
  - "Online Mehrspieler" banner in GameSetup.
  - Automatic URL parsing for `?room=ROOM_ID`.
- **Localization (i18n)**:
  - Added all multiplayer lobby translation keys to both `de/translation.json` and `en/translation.json`.

---

## Verification Results
- **Vitest Unit Tests**: `17/17 tests passing` (`npm test`)
- **ESLint**: `0 errors` (`npm run lint`)
- **TypeScript & Vite Build**: `npm run build` succeeded with exit code 0.
