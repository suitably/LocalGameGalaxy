# Nexumia Server (One-Click Docker & Companion Backend)

> **Renamed from "MelodiQ Server" (#530).** The Docker image `nexumia/nexumia-server` replaces `nexumia/melodiq-server`; the old name is a deprecated alias that is still published for existing users. Use `nexumia-server` in compose files. Folder `server/`, API routes and storage keys are unchanged.

High-performance Hono companion server (Nexumia server) for **MelodiQ** (karaoke streaming, USDB downloads, automated stem separation with UVR MDX-Net, AI lyrics alignment with Whisper).

WebRTC signaling is handled by the companion **galaxy-signaling** microservice on port `8000`, orchestrated together via Docker Compose.

> 💡 **Note**: Party games (**GuessArt**, **Gartic Phone**, **Werewolf**, **Qwixx**) run completely serverless peer-to-peer via MQTT/WebSockets and do **not** require the Nexumia server (MelodiQ plugin). For WebRTC microphone audio and screen mirroring in offline or private networks, only the lightweight `signaling` service (port 8000) is required.

---

## 1. Quick Start

Run the entire companion stack (Nexumia server with the MelodiQ media plugin + WebRTC Signaling) with a single command:

```bash
# 1. Create your local folders (one per plugin)
mkdir -p config music models tabletop notes

# 2. Start stack
docker compose up -d

# 3. Check health and logs
curl http://localhost:3000/health
curl http://localhost:8000/health
docker compose logs -f
```

- **Nexumia server** (MelodiQ media): `http://localhost:3000`
- **WebRTC Signaling Server**: `ws://localhost:8000` (Health: `http://localhost:8000/health`)

---

## 2. Configuration & Environment Variables

All settings can be configured via environment variables in `docker-compose.yml` or a `.env` file:

| Variable          | Default                        | Description                                                                                       |
| :---------------- | :----------------------------- | :------------------------------------------------------------------------------------------------ |
| `PORT`            | `3000`                         | HTTP port inside the container                                                                    |
| `NODE_ENV`        | `production`                   | Node runtime environment                                                                          |
| `PLUGINS`         | `relay,melodiq,tabletop,notes` | Plugins to load; drop the ones you do not need                                                    |
| `MUSIC_DIR`       | `/app/music`                   | Root folder containing UltraStar karaoke songs                                                    |
| `TABLETOP_DIR`    | `/app/tabletop`                | Tabletop game library; games saved from the app go to `saved/` inside it                          |
| `NOTES_DIR`       | `/app/notes`                   | Old Melodiq Notes library, moved into song folders once on startup (#568)                         |
| `CONFIG_PATH`     | `/app/config/config.json`      | Persistent configuration file path                                                                |
| `SECURITY_TOKEN`  | _(auto-generated)_             | Master authentication bearer token. Generated automatically and stored in `config.json` if empty. |
| `ENABLE_TUNNEL`   | `false`                        | Set to `true` to auto-launch Cloudflare Quick Tunnel on container startup                         |
| `ALLOWED_ORIGINS` | `*`                            | Comma-separated list of allowed CORS origins, or `*` for all                                      |
| `MODELS_DIR`      | `/app/models`                  | Storage path for ONNX stem models & Whisper AI weights                                            |

---

## 3. Volumes & Directory Structure

```yaml
volumes:
  - ./music:/app/music # Your UltraStar song library (read/write for stem creation)
  - ./config:/app/config # Persistent configuration (config.json)
  - ./models:/app/models # Downloaded ONNX and PyTorch/Whisper models
  - ./tabletop:/app/tabletop # Tabletop games (saved games in tabletop/saved/)
  - ./notes:/app/notes # old Melodiq Notes library (migration source)
```

The app's **Settings → Server → Docker Compose Generator** builds this file for you: pick the games, folders, ports and token, download it and run `docker compose up -d`.

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
│   │   ├── video.mp4
│   │   ├── Lead.mxl                       # score for Melodiq Notes (MusicXML/MIDI)
│   │   ├── Lead.mxl.marks.json            # bar marks (score ↔ recording)
│   │   ├── Take 1.webm                    # Notes recording
│   │   └── song.json                      # title, artist, score labels
│   ├── Debussy - Clair de Lune/           # a song without .txt (sheet music only)
│   │   ├── song.json                      # stable id, title, artist
│   │   └── Clair de Lune.mxl
├── config/                   # [VOLUME] Persistent server settings
│   └── config.json
├── models/                   # [VOLUME] Cached ML models
├── tabletop/                 # [VOLUME] Tabletop games
│   └── saved/My Game/game.json        # saved from the app
└── notes/                    # [VOLUME] old Melodiq Notes library (migration source)
    └── .song-folders-migrated.json        # which pieces were moved into song folders
```

The song folder is the only store for Melodiq and Melodiq Notes (#568). On startup the server moves the old Notes library (`notes/`, one folder per piece with `piece.json`) into song folders once: linked pieces into their song's folder, others into new song folders without `.txt`. The originals stay until `POST /api/notes/migration/confirm`; `GET /api/notes/migration` shows the state ([song pipeline §4](../docs/tech/song-pipeline.md#4-sheet-music-for-melodiq-notes)).

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

- **Node.js 24** (Hono runtime)
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

If you want to build and run the Docker image from local sources instead of pulling `nexumia/nexumia-server:latest`:

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
