# ===== Stage 1: Build TypeScript =====
FROM node:24-slim AS builder

WORKDIR /app

# Copy dependency definitions and TypeScript config
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy source code and build
COPY src/ ./src/
RUN npm run build

# ===== Stage 2: Lightweight Base Runtime (~200MB) =====
FROM node:24-slim AS base

# System dependencies for audio transcoding, healthcheck, and yt-dlp runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp for YouTube music downloads
RUN pip3 install --no-cache-dir --break-system-packages yt-dlp

WORKDIR /app

# Node production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built server from builder stage
COPY --from=builder /app/dist ./dist

# Copy Python helper scripts (e.g. lyrics alignment)
COPY src/scripts ./src/scripts
COPY src/scripts ./dist/scripts

# Persistent volumes (one per plugin; a missing mount is just an empty folder)
RUN mkdir -p /app/music /app/config /app/models /app/tabletop /app/notes
VOLUME /app/music
VOLUME /app/config
VOLUME /app/models
VOLUME /app/tabletop
VOLUME /app/notes

# Runtime environment configuration
ENV PORT=3000 \
    NODE_ENV=production \
    PLUGINS=relay,melodiq,tabletop,notes \
    MUSIC_DIR=/app/music \
    TABLETOP_DIR=/app/tabletop \
    NOTES_DIR=/app/notes \
    CONFIG_PATH=/app/config/config.json \
    MODELS_DIR=/app/models \
    TORCH_HOME=/app/models \
    WHISPER_MODELS_DIR=/app/models

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]

# ===== Stage 3: Full AI Runtime (PyTorch, audio-separator, whisper-timestamped) =====
FROM base AS full

# System dependencies for compiling C extensions (e.g. diffq for audio-separator)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Python AI dependencies (PyTorch CPU, audio-separator, whisper-timestamped, auditok)
RUN pip3 install --no-cache-dir --break-system-packages --upgrade pip setuptools wheel \
    && pip3 install --no-cache-dir --break-system-packages \
    torch torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/cpu \
    && pip3 install --no-cache-dir --break-system-packages \
    "audio-separator[cpu]" \
    whisper-timestamped \
    auditok