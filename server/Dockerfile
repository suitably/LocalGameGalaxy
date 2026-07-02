FROM node:20-bookworm-slim

# Install Python, pip, ffmpeg and yt-dlp
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    ffmpeg \
    curl \
    ca-certificates \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && apt-get purge -y --auto-remove curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=docker.io/denoland/deno:bin /deno /usr/local/bin/deno


# Pre-install CPU-only PyTorch and audio-separator (enables out-of-the-box vocal separation)
RUN pip3 install --no-cache-dir --break-system-packages \
    torch torchvision torchaudio \
    --index-url https://download.pytorch.org/whl/cpu \
    && pip3 install --no-cache-dir --break-system-packages \
    "audio-separator[cpu]" "whisper-timestamped"

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install --production

# Copy server source code
COPY . .

# Expose ports (default config uses 3000 and 3001)
EXPOSE 3000
EXPOSE 3001

# Command to run the server
CMD ["node", "index.js"]
