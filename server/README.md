# MelodiQ Server (One-Click Docker & Companion Backend)

High-performance Hono companion server for **MelodiQ** (karaoke streaming, USDB downloads, automated stem separation with UVR MDX-Net, AI lyrics alignment with Whisper, and WebRTC signaling).

> 💡 **Note**: Party games (**GuessArt**, **Gartic Phone**, **Werewolf**, **Qwixx**) run completely serverless peer-to-peer via MQTT/WebSockets and do **not** require this server.

---

## 1. Quick Start

Run the entire stack with a single command:

```bash
# 1. Create your local folders
mkdir -p music config models

# 2. Start container
docker compose up -d

# 3. Check health and logs
curl http://localhost:3000/health
docker compose logs -f
```

The server is now live at `http://localhost:3000`.

---

## 2. Configuration & Environment Variables

All settings can be configured via environment variables in `docker-compose.yml` or a `.env` file:

| Variable | Default | Description |
|:---|:---|:---|
| `PORT` | `3000` | HTTP port inside the container |
| `NODE_ENV` | `production` | Node runtime environment |
| `MUSIC_DIR` | `/app/music` | Root folder containing UltraStar karaoke songs |
| `CONFIG_PATH` | `/app/config/config.json` | Persistent configuration file path |
| `SECURITY_TOKEN` | *(auto-generated)* | Master authentication bearer token. Generated automatically and stored in `config.json` if empty. |
| `ENABLE_TUNNEL` | `false` | Set to `true` to auto-launch Cloudflare Quick Tunnel on container startup |
| `ALLOWED_ORIGINS` | `*` | Comma-separated list of allowed CORS origins, or `*` for all |
| `MODELS_DIR` | `/app/models` | Storage path for ONNX stem models & Whisper AI weights |

---

## 3. Volumes & Directory Structure

```yaml
volumes:
  - ./music:/app/music      # Your UltraStar song library (read/write for stem creation)
  - ./config:/app/config    # Persistent configuration (config.json)
  - ./models:/app/models    # Downloaded ONNX and PyTorch/Whisper models
```

### Container Directory Layout

```
/app/
├── dist/                     # Compiled TypeScript server
├── node_modules/             # Node production dependencies
├── src/scripts/              # Python alignment and helper scripts
├── music/                    # [VOLUME] Song library
│   ├── Artist - Title/
│   │   ├── Artist - Title.txt              # UltraStar notes & lyrics
│   │   ├── Artist - Title.mp3             # Audio
│   │   ├── Artist - Title (Instrumental).mp3
│   │   ├── Artist - Title (Vocals).mp3
│   │   ├── cover.jpg
│   │   └── video.mp4
├── config/                   # [VOLUME] Persistent server settings
│   └── config.json
└── models/                   # [VOLUME] Cached ML models
```

---

## 4. Network & Remote Access

### Local Network (LAN)
Access from any device on your home network:
```
http://<SERVER_IP>:3000
```
Pairing in the frontend:
1. Open MelodiQ in your browser or PWA.
2. Go to **Settings ➔ Server**.
3. Input your server URL (`http://<SERVER_IP>:3000`) and security token (found in `config/config.json` or docker logs).

### Cloudflare Quick Tunnel (Zero Port-Forwarding)
To share your karaoke session with friends across the internet without opening router ports:

```bash
docker compose --profile tunnel up -d
```
Inspect logs for the public HTTPS URL:
```bash
docker compose logs melodiq-tunnel
```

### Reverse Proxy (Nginx / Caddy / Pangolin)
Point your reverse proxy to `http://127.0.0.1:3000`. WebSocket upgrades are handled automatically on the HTTP port for signaling.

---

## 5. Preinstalled AI Dependencies & Image Size

The Docker image includes full pre-installed AI audio and video processing tools:
- **Node.js 20 LTS** (Hono runtime)
- **ffmpeg** (audio transcoding & extraction)
- **yt-dlp** (YouTube music & video downloader)
- **audio-separator[cpu]** (ONNX MDX-Net stem separation)
- **whisper-timestamped** (AI lyrics audio alignment)
- **PyTorch CPU** (`torch`, `torchvision`, `torchaudio` from official CPU index)

### Image Size:
- **Base image footprint**: ~3.0 – 3.5 GB (due to PyTorch CPU wheels and ML runtimes).
- **First-run download**: AI models (UVR MDX-Net ~60MB, Whisper Base ~140MB) are downloaded on-demand into `/app/models` and persisted across restarts.

---

## 6. Development & Local Image Build

If you want to build and run the Docker image from local sources instead of pulling `nexumia/melodiq-server:latest`:

```bash
# Build & start with local Dockerfile and mounted source directories
docker compose -f docker-compose.dev.yml up --build
```

---

## 7. Manual Setup (Without Docker)

```bash
cd server
npm install
npm run build
npm start
```
