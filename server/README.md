# Nexumia Companion Server (Melodiq & Galaxy Helper)

Lightweight Node.js backend companion server for **Melodiq** (karaoke media streaming, USDB downloader, AI vocal separation, and WebRTC signaling tracker).

> 💡 **Note**: Party games (**GuessArt**, **Gartic Phone**, **Werewolf**, **Qwixx**) run completely serverless peer-to-peer via MQTT/WebSockets and do **not** require this server.

---

## Quickstart with Docker Compose

Docker Compose is the recommended way to run the server with zero configuration.

### 1. Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose

### 2. Start the Server
Create or edit `docker-compose.yml` (or download it directly from the in-app **Settings -> Server** wizard):

```yaml
services:
  # Melodiq Companion Server (Karaoke Media Streaming, USDB & AI Vocal Separation)
  # For AI vocal separation & Whisper, use image: nexumia/melodiq-server:ai
  melodiq-server:
    image: nexumia/melodiq-server:latest
    container_name: melodiq-server
    restart: unless-stopped
    ports:
      - "3000:3000"
      - "3001:3001"
    volumes:
      - ./music:/app/music:ro
    environment:
      - NODE_ENV=production
      - PORT=3000
      - SECURITY_TOKEN=your_master_token_here
      - MUSIC_DIR=/app/music
      - ALLOWED_ORIGINS=*
```

Run:
```bash
docker compose up -d
```

### 3. Access & Pair
- Open the web app at `http://localhost:5173` (or your PWA)
- Go to **Settings ➔ Server**
- The live detector will automatically discover `http://localhost:3000` and pair your token.

---

## Images & Optional Tunnel

### Server Image Flavors
- `nexumia/melodiq-server:latest`: Lightweight standard server (~200MB, Node.js + ffmpeg + yt-dlp + WebRTC signaling + relay).
- `nexumia/melodiq-server:ai`: Full AI image (~2GB, includes PyTorch, ONNX Vocal Separation & Whisper). Also tagged as `:melodiq`.

### Cloudflare Quick Tunnel (Public HTTPS without router port-forwarding)
```bash
docker compose --profile tunnel up -d
```

---

## Manual Setup (Node.js)

```bash
cd server
npm install
npm start
```
