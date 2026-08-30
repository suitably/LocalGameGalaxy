# Backend Modular Micro-Kernel & GuessArt Multiplayer Lobby Plan

## Goal Description
1. **Backend Modularization (Micro-Kernel & 3 Deployment Targets)**:
   - Refactor `server/` into a lightweight, modular **Micro-Kernel** using TypeScript + Hono.
   - Provide clean plug-in structure (`server/src/plugins/`):
     - `relay` plugin (signaling, room coordination, ephemeral mailbox)
     - `melodiq` plugin (song library scanner, streaming)
     - `melodiq-ai` plugin (heavy ONNX stem separation & Whisper lyric alignment)
   - Support 3 zero-friction deployment targets:
     - **Cloudflare Workers** (1-Click free 24/7 cloud deploy)
     - **Desktop / 1-Click with Quick Tunnel** (Local laptop server with instant public HTTPS URL via Cloudflare Tunnel)
     - **Docker Compose** with profiles (`melodiq`, `ai`, `tunnel`) for self-hosters.
2. **GuessArt Multiplayer Live Lobby**:
   - Add an interactive, real-time multiplayer Lobby for GuessArt:
     - Host creates Room, gets Share Link & QR code with room code & relay URL.
     - Joining players enter their name and appear live in the lobby roster.
     - Host clicks "Spiel starten" when everyone is ready.
     - Seamless live gameplay with drawer selection, live guessing, and round progression.

---

## Proposed Architecture & File Structure

### Backend (`server/`)
```
server/
├── src/
│   ├── core/
│   │   ├── app.ts            # Hono application core
│   │   ├── types.ts          # Core plugin interfaces
│   │   ├── pluginLoader.ts   # Dynamic plugin registration
│   │   └── tunnel.ts         # Cloudflare Quick Tunnel provider
│   ├── plugins/
│   │   ├── relay/            # Ephemeral P2P signaling & room relay
│   │   │   └── index.ts
│   │   ├── melodiq/          # Song scanner & audio streaming
│   │   │   └── index.ts
│   │   └── melodiq-ai/       # Optional heavy ONNX & Whisper worker
│   │       └── index.ts
│   └── index.ts              # Node/Standalone Entrypoint
├── wrangler.toml             # Cloudflare Workers 1-Click configuration
├── Dockerfile                # Multi-stage lightweight Docker image
└── docker-compose.yml        # Modular profiles (core, melodiq, ai, tunnel)
```

### GuessArt Frontend (`src/games/guessart/`)
- **`components/GuessArtLobby.tsx`**:
  - Interactive lobby screen:
    - Player roster with avatars & host badge.
    - Name input for joining clients.
    - Room code, QR code & copy link button.
    - Game settings for Host (rounds, language, manual words).
    - "Spiel starten" button (Host only).
    - "Warten auf Spielstart..." status for joined players.
- **`logic/guessartRoomManager.ts`**:
  - Manages real-time room state over WebSockets / WebRTC / Relay.
  - Dispatches room actions (`JOIN_LOBBY`, `START_GAME`, `NEXT_TURN`, `SYNC_STATE`).
- **`GuessArtGame.tsx`**:
  - Switch between Solo/Local Pass & Play, Multiplayer Lobby, and Active In-Game View.

---

## Verification Plan
1. **Backend Tests & Build**: Test Hono server compilation, plugin mounting, and Cloudflare Worker typechecks.
2. **Frontend Tests**: Run `npm test` (`vitest run`).
3. **Linting**: Run `npm run lint` with 0 errors.
4. **Bundle Build**: Run `npm run build` (`tsc -b && vite build`).
5. **Walkthrough Documentation**: Write `docs/verification/backend-plugins-and-guessart-lobby-walkthrough.md`.
