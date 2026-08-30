FROM node:20-bookworm-slim AS base

# Only install essential tools: ffmpeg, yt-dlp, deno
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    ca-certificates \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && apt-get purge -y --auto-remove curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=docker.io/denoland/deno:bin /deno /usr/local/bin/deno

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --production
COPY . .

EXPOSE 3000
EXPOSE 3001

CMD ["node", "index.js"]

FROM base AS full

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir --break-system-packages \
    torch torchvision torchaudio \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    && pip3 install --no-cache-dir --break-system-packages \
    "audio-separator[cpu]" "whisper-timestamped"