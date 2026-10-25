<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="design/brand/nexumia-lockup.svg" />
    <img src="design/brand/nexumia-lockup-ink.svg" alt="Nexumia" width="360" />
  </picture>
</p>

# LocalGameGalaxy

Brand: Nexumia, the couch mark. Colours, type and components are described in [DESIGN.md](DESIGN.md).

LocalGameGalaxy is a purely client-side, offline-first web application suite designed to act as a hub for local group games (like Werewolf, Imposter, and Melodiq). It allows players to use their smartphones as controller screens while looking at a main television screen (TV/Host mode), synchronized via a local peer-to-peer WebRTC network.

---

## 1. Project Architecture Overview

LocalGameGalaxy is composed of three units:

1. **React Frontend Application (main workspace)**: A client-side Single Page Application (SPA) built with React, TypeScript, and Vite. It runs in the web browser or as a native Android app via Capacitor.
2. **Companion Server (`/server`, optional)**: A Node/Hono plugin server for the Melodiq song library (media streaming, USDB/yt-dlp downloads, stem separation, lyric alignment), tabletop asset folders and an HTTP room relay.
3. **Signaling Tracker (`/signaling`, optional)**: A standalone BitTorrent WebSocket tracker (port 8000) for WebRTC discovery when public trackers are not wanted.

---

## 2. Prerequisites

To set up the development environment, ensure you have:

- **Node.js**: Version 24 (see `.nvmrc`; `engines.node` is `>=24`).
- **Python 3 + pip** (only for the companion server's vocal separation and lyric alignment; the server can install its Python packages itself, or use the Docker `full` image).
- **Android SDK / Android Studio**: Required if building and running the mobile client as a native Android app via Capacitor.
- **FFmpeg**: Required on the system path for song processing and audio separation tasks.

---

## 3. Local Development Setup

Follow these steps to set up the repository locally:

### Step 1: Install Dependencies

Install dependencies at the root workspace:

```bash
npm install
```

Install dependencies for the companion server:

```bash
cd server
npm install
cd ..
```

### Step 2: Configure the companion server (optional)

The server creates `config.json` (with a random token) on first start. To pre-configure song directories:

```bash
cd server
cp config.example.json config.json
```

Tokens, environment variables and HTTPS for phones: [Secrets & Local Configuration Guide](docs/tech/secrets-management.md).

---

## 4. Running the Applications

Only the frontend (step 3) is required. The tracker and the companion server are optional and only needed for self-hosted signaling, Melodiq song libraries and tabletop asset folders:

### 1. Start the local WebRTC signaling tracker

```bash
npm run tracker
```

This starts the BitTorrent-based tracker on the port configured for peer discovery.

### 2. Start the local companion host server

```bash
(cd server && npm run build)
npm run host
```

This runs the companion server from `server/` on port 3000 (song library, downloads, separation, tabletop assets).

### 3. Start the React frontend application

```bash
npm run dev
```

By default, this launches Vite on `http://localhost:5173`. Open this URL to access the main game hub.

---

## 5. Building and Testing

- **Linting**: Enforce code style and TypeScript rules:
  ```bash
  npm run lint
  ```
- **Building**: Compile and bundle the web application:
  ```bash
  npm run build
  ```
- **Testing**: `npm test` (Vitest); server: `cd server && npm run build && npm test`. Details in the [Testing Guide](docs/tech/testing-guide.md).
- **All local gates**: `npm run quality-gates`.

---

## 6. Documentation Resources (OKF v0.2 Knowledge Bundle)

For deeper technical information, please consult the `docs/` Open Knowledge Bundle:

- [Knowledge Bundle Root](docs/index.md) (OKF v0.2 Index)
- [Game Catalog](docs/tech/game-catalog.md)
- [Open Questions](docs/open-questions.md) — known bugs and pending decisions
- [System Architecture (SSoT)](docs/tech/architecture.md)
- [Cross-Device Synchronization Protocol](docs/tech/sync-protocol.md)
- [Data Persistence Layer](docs/tech/persistence.md)
- [Coding Conventions & Anti-God-Component Architecture](docs/tech/coding-conventions.md)
- [Secrets & Local Configuration](docs/tech/secrets-management.md)
- [Melodiq Game Architecture](docs/tech/melodiq-architecture.md)
- [Data Models Specification](docs/tech/data-models.md)

---

## 7. Working with AI agents

Agents (Claude Code, Copilot) follow [AGENTS.md](AGENTS.md); Claude Code loads it via [CLAUDE.md](CLAUDE.md). Both point into the `docs/` bundle and describe how to keep it in sync with the code.
