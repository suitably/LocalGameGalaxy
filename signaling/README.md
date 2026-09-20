# LocalGameGalaxy WebRTC Signaling Server

Lightweight, standalone WebRTC BitTorrent tracker signaling microservice for LocalGameGalaxy and peer-to-peer web applications.

- **Role**: Coordinates the exchange of WebRTC connection offers, answers, and ICE candidate metadata between hosts and client devices (e.g. smartphone microphones, TV screen mirroring, multiplayer lobbies).
- **Lightweight**: Built on Alpine Linux (`node:20-alpine`), consumes < 30 MB RAM and has a container image size of under 50 MB.
- **Independent**: Completely decoupled from MelodiQ's machine learning companion server. Can be run anywhere (Raspberry Pi, VPS, local machine) for any tool or game.

---

## 1. Quick Start

### Option A: Docker Compose (Standalone)

```bash
cd signaling
docker compose up -d
```

### Option B: Plain Docker

```bash
docker run -d \
  --name galaxy-signaling \
  -p 8000:8000 \
  --restart unless-stopped \
  nexumia/galaxy-signaling:latest
```

### Option C: Node.js (Direct)

```bash
cd signaling
npm install
npm start
```

---

## 2. Configuration & Ports

| Variable | Default | Description |
|:---|:---|:---|
| `PORT` / `TRACKER_PORT` | `8000` | Port for WebSocket and HTTP traffic |
| `HOST` / `TRACKER_HOST` | `0.0.0.0` | Bind address (all network interfaces by default) |
| `NODE_ENV` | `production` | Node environment |

### Endpoints

- **WebSocket Signaling**: `ws://<host>:8000/announce` or `ws://<host>:8000/`
- **Health Check**: `http://<host>:8000/health` (returns JSON status)
- **Tracker Statistics**: `http://<host>:8000/stats`

---

## 3. Reverse Proxy & HTTPS / WSS Support

If your frontend is served over **HTTPS** (e.g. `https://nexumia.de`), browsers block unencrypted `ws://` connections due to mixed-content restrictions. Use a reverse proxy (e.g., Nginx, Caddy, Cloudflare) with TLS:

### Nginx Example

```nginx
server {
    listen 8443 ssl;
    server_name tracker.local;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Connect your clients to `wss://tracker.local:8443`.
