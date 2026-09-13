# ===== Stage 1: Build TypeScript =====
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependency definitions and TypeScript config
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy source code and build
COPY src/ ./src/
RUN npm run build

# ===== Stage 2: Runtime =====
FROM node:20-slim

# System dependencies (including compiler for C extensions like diffq)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    build-essential \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Python AI dependencies (PyTorch CPU, audio-separator, whisper-timestamped, yt-dlp)
RUN pip3 install --no-cache-dir --break-system-packages --upgrade pip setuptools wheel \
    && pip3 install --no-cache-dir --break-system-packages \
    torch torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/cpu \
    && pip3 install --no-cache-dir --break-system-packages \
    yt-dlp \
    "audio-separator[cpu]" \
    whisper-timestamped \
    auditok

WORKDIR /app

# Node production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built server from builder stage
COPY --from=builder /app/dist ./dist

# Copy Python helper scripts (e.g. lyrics alignment)
COPY src/scripts ./src/scripts
COPY src/scripts ./dist/scripts

# Persistent volumes
VOLUME /app/music
VOLUME /app/config
VOLUME /app/models

# Runtime environment configuration
ENV PORT=3000 \
    NODE_ENV=production \
    MUSIC_DIR=/app/music \
    CONFIG_PATH=/app/config/config.json \
    MODELS_DIR=/app/models \
    TORCH_HOME=/app/models \
    WHISPER_MODELS_DIR=/app/models

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]