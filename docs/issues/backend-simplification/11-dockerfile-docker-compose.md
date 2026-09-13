# Dockerfile & Docker Compose — One-Click Server

## Context

Nach der Hono-Migration (Issue #7) soll der MelodiQ-Server als **Docker One-Click Image** bereitgestellt werden. Alle Dependencies (yt-dlp, ffmpeg, Python, audio-separator, whisper-timestamped, PyTorch CPU) sind vorinstalliert im Image. Der User muss nur `docker compose up` ausführen und seinen Musik-Ordner mounten.

## Voraussetzungen

> ⚠️ Issue #7 (Hono Migration) muss abgeschlossen sein.

## Aufgabe

Erstelle `Dockerfile` und `docker-compose.yml` im `server/` Verzeichnis.

## Dependencies im Image

| Dependency | Zweck | Install-Methode |
|:---|:---|:---|
| **Node.js 20 LTS** | Hono Server Runtime | Base Image `node:20-slim` |
| **ffmpeg** | Audio-Transcoding | `apt-get install ffmpeg` |
| **yt-dlp** | YouTube Downloads, Suche | `pip3 install yt-dlp` oder Binary von GitHub Releases |
| **Python 3.11+** | Für audio-separator & whisper | `apt-get install python3 python3-pip python3-venv` |
| **audio-separator[cpu]** | ONNX Vocal Stem Separation | `pip3 install audio-separator[cpu]` |
| **whisper-timestamped** | AI Lyrics Alignment | `pip3 install whisper-timestamped` |
| **PyTorch CPU** | ML Runtime für audio-separator | `pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu` |
| **curl** | Für yt-dlp Thumbnail-Download | `apt-get install curl` |

## Dockerfile Entwurf

```dockerfile
# ===== Stage 1: Build TypeScript =====
FROM node:20-slim AS builder
WORKDIR /app
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# ===== Stage 2: Runtime =====
FROM node:20-slim

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python AI dependencies
RUN pip3 install --break-system-packages \
    yt-dlp \
    audio-separator[cpu] \
    whisper-timestamped \
    torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

WORKDIR /app

# Node dependencies (production only)
COPY server/package*.json ./
RUN npm ci --production

# Built server
COPY --from=builder /app/dist ./dist

# Volumes
VOLUME /app/music
VOLUME /app/config

# Environment
ENV PORT=3000
ENV MUSIC_DIR=/app/music
ENV NODE_ENV=production

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s \
    CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

## Docker Compose Entwurf

```yaml
# docker-compose.yml
version: '3.8'

services:
  melodiq:
    build:
      context: .
      dockerfile: server/Dockerfile
    container_name: melodiq-server
    ports:
      - "3000:3000"
    volumes:
      - ./music:/app/music          # Song Library
      - ./config:/app/config        # Persistent config (config.json, etc.)
    environment:
      - PORT=3000
      - MUSIC_DIR=/app/music
      - SECURITY_TOKEN=             # Auto-generated if empty
      - ENABLE_TUNNEL=false         # Set to 'true' for Cloudflare Quick Tunnel
      - ALLOWED_ORIGINS=*
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      start_period: 60s
      retries: 3
```

## Config Persistence

- `config.json` wird in `/app/config/` gespeichert (Volume Mount)
- Enthält: `token`, `directories`, `downloadDir`, `usdbUsername`, `usdbPassword`, `apiKeys`, `autoVocalSeparation`, `defaultDownloadMode`, `githubToken`
- Bei erstem Start wird `token` automatisch generiert und in `config.json` persistiert

## Verzeichnis-Struktur im Container

```
/app/
├── dist/           # Compiled TypeScript
├── node_modules/   # Node dependencies
├── music/          # [VOLUME] Song library
│   ├── Artist - Title/
│   │   ├── Artist - Title.txt    # UltraStar lyrics
│   │   ├── Artist - Title.mp3   # Audio
│   │   ├── Artist - Title (Instrumental).mp3
│   │   ├── Artist - Title (Vocals).mp3
│   │   ├── cover.jpg
│   │   └── video.mp4
│   └── ...
├── config/         # [VOLUME] Persistent config
│   └── config.json
└── package.json
```

## README / Dokumentation

Erstelle eine `server/README.md` mit:

1. **Quick Start**
   ```bash
   # Musik-Ordner bereitstellen
   mkdir music
   # Starten
   docker compose up -d
   # Server ist erreichbar unter http://localhost:3000
   ```

2. **Konfiguration** — Umgebungsvariablen erklären

3. **Volumes** — Was wo gemountet wird

4. **Zugriff von anderen Geräten**
   - Im lokalen Netzwerk: `http://<server-ip>:3000`
   - Extern: Reverse Proxy (Pangolin, Nginx) oder `ENABLE_TUNNEL=true`

5. **Image-Größe** — Dokumentieren (erwartbar ~3-5 GB wegen PyTorch)

## Akzeptanzkriterien

- [ ] `docker compose up` startet den Server erfolgreich
- [ ] Songs im gemounteten Volume werden beim Start gescannt
- [ ] Frontend kann sich verbinden und Songs sehen
- [ ] YouTube-Download funktioniert im Container (`yt-dlp`)
- [ ] Stem Separation funktioniert im Container (`audio-separator`)
- [ ] Whisper AI Alignment funktioniert im Container (`whisper-timestamped`)
- [ ] `config.json` persistiert nach Container-Neustart
- [ ] Health Check (`/health`) funktioniert
- [ ] Token wird beim ersten Start automatisch generiert
- [ ] Image-Größe ist dokumentiert
- [ ] `server/README.md` mit Setup-Anleitung vorhanden
- [ ] `.dockerignore` vorhanden (node_modules, dist, .git etc.)

## Labels

`melodiq`, `backend`, `devops`, `feature`
