#!/usr/bin/env bash
set -e

INSTALL_DIR="${INSTALL_DIR:-$HOME/nexumia-server}"
REPO="suitably/LocalGameGalaxy"

echo "============================================"
echo "      🚀 Nexumia Server Quick Installer      "
echo "============================================"
echo "Target directory: $INSTALL_DIR"

mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Detect OS
OS="linux"
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
fi

ARCHIVE="nexumia-server-${OS}.tar.gz"
DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/${ARCHIVE}"

echo "⬇️  Downloading latest ${OS} server binary from GitHub..."
if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$DOWNLOAD_URL" -o "$ARCHIVE"
elif command -v wget >/dev/null 2>&1; then
    wget -q "$DOWNLOAD_URL" -O "$ARCHIVE"
else
    echo "❌ Error: Neither curl nor wget found. Please install one of them."
    exit 1
fi

echo "📦 Extracting $ARCHIVE..."
tar -xzf "$ARCHIVE"
rm "$ARCHIVE"

# Create default config.json if not present
if [ ! -f "config.json" ]; then
    TOKEN="${TOKEN:-$(head -c 32 /dev/urandom | xxd -p -c 32 2>/dev/null || openssl rand -hex 16 2>/dev/null || cat /proc/sys/kernel/random/uuid 2>/dev/null | tr -d '-' || echo "nexumia_secret_$(date +%s)")}"
    cat << CFG > config.json
{
  "port": 3000,
  "token": "${TOKEN}",
  "directories": ["./music"],
  "allowedOrigins": ["*"]
}
CFG
    echo "🔑 Generated fresh security token in config.json: ${TOKEN}"
fi

mkdir -p music
chmod +x nexumia-server-* start-server.* 2>/dev/null || true

echo "✅ Installation completed successfully!"
echo "🚀 Starting Nexumia Server now..."
if [ -f "./start-server.sh" ]; then
    exec ./start-server.sh
elif [ -f "./start-server.command" ]; then
    exec ./start-server.command
else
    exec ./nexumia-server-*
fi
