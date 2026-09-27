# LocalGameGalaxy

LocalGameGalaxy is a purely client-side, offline-first web application suite designed to act as a hub for local group games (like Werewolf, Imposter, and Melodiq). It allows players to use their smartphones as controller screens while looking at a main television screen (TV/Host mode), synchronized via a local peer-to-peer WebRTC network.

---

## 1. Project Architecture Overview

LocalGameGalaxy is composed of two main units:
1. **React Frontend Application (main workspace)**: A client-side Single Page Application (SPA) built with React, TypeScript, and Vite. It runs in the web browser or as a native Android app via Capacitor.
2. **Companion Server & Tracker (`/server`)**: A lightweight Node/Express helper running locally to host the media server, coordinate local file ingestion (e.g., song downloads/processing), and host a local BitTorrent signaling tracker for WebRTC discovery.

---

## 2. Prerequisites

To set up the development environment, ensure you have:
- **Node.js**: Version 20.x or higher is recommended.
- **Python**: Version 3.10+ (required for vocal separation, pitch analysis, and audio forced-alignment scripts).
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

### Step 2: Configure Environment Settings
Copy the example configuration to initialize the local server and client settings:
```bash
cp config.example.json config.json
```
For advanced steps, local SSL certificates, and generating security tokens, refer to the [Secrets & Local Configuration Guide](file:///home/deck/Projects/LocalGameGalaxy/docs/tech/secrets-management.md).

---

## 4. Running the Applications

To run the local development suite, you need to start the three core processes:

### 1. Start the local WebRTC signaling tracker
```bash
npm run tracker
```
This starts the BitTorrent-based tracker on the port configured for peer discovery.

### 2. Start the local companion host server
```bash
npm run host
```
This runs the companion server inside the `server/` directory, which handles song ingestion, vocal separation, and static asset distribution.

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
- **Testing**: For detailed instructions on running unit and integration tests, refer to the [Testing Guide](file:///home/deck/Projects/LocalGameGalaxy/docs/tech/testing-guide.md) (coming soon).

---

## 6. Documentation Resources

For deeper technical information, please consult the `docs/` directory:
- [System Architecture](file:///home/deck/Projects/LocalGameGalaxy/docs/tech/architecture.md)
- [Secrets & Local Configuration](file:///home/deck/Projects/LocalGameGalaxy/docs/tech/secrets-management.md)
- [Melodiq Game Architecture](file:///home/deck/Projects/LocalGameGalaxy/docs/tech/melodiq-architecture.md)
- [Data Models Specification](file:///home/deck/Projects/LocalGameGalaxy/docs/tech/data-models.md)
