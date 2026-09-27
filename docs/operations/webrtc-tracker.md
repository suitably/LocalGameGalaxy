# Standalone WebRTC Tracker Deployment Runbook [ID: OPS-WEBRTC-TRACKER]

This runbook covers deployment, configuration, process management, and security constraints for the self-hosted WebRTC signaling tracker.

---

## 1. Overview & Infrastructure Role

The WebRTC signaling microservice (`signaling/` or `scripts/start-tracker.js`) runs a local BitTorrent tracker using the WebSocket interface.
- **Role**: Coordinates the exchange of connection offers, answers, and ICE candidate metadata between the host and client phones on a local network.
- **Necessity**: Vital in offline environments or firewalled local area networks where public signaling servers (e.g., `wss://tracker.openwebtorrent.com`) are blocked or unreachable.
- **Microservice Architecture**: Fully decoupled from MelodiQ, packaged as a ~45 MB Alpine container (`nexumia/galaxy-signaling:latest`).

---

## 2. Configuration & Custom Port Binding

By default, the tracker binds to port `8000` on all network interfaces (`0.0.0.0`). To prevent port conflicts on shared hosts, you can override this binding using environment variables:

### Setting a Custom Port via CLI
```bash
# Using PORT environment variable
PORT=8500 node signaling/src/index.js

# Or using TRACKER_PORT environment variable
TRACKER_PORT=8500 node signaling/src/index.js
```

---

## 3. Deployment Modes

### Mode A: Running via PM2 or Direct Node
```bash
cd signaling
npm install
PORT=8000 node src/index.js
```

### Mode B: Containerized Deployment (Docker Compose)
The tracker is available as a standalone service or orchestrated in `server/docker-compose.yml`:
```yaml
services:
  signaling:
    image: nexumia/galaxy-signaling:latest
    container_name: galaxy-signaling
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - PORT=8000
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
```

---

## 4. Security & Mixed Content Restrictions

If the React Host UI or the Phone Client is loaded over secure **HTTPS**, the browser's security model prohibits loading unencrypted WebSocket connections (`ws://`) to protect users from mixed content execution.

### The Problem
- Accessing `https://nexumia.de` (HTTPS client).
- Connecting to `ws://192.168.1.100:8000` (HTTP/WS local tracker).
- **Result**: The browser blocks the WebSocket connection.

### The Solutions

#### Solution 1: Developer SSL Bypass (Local Test Only)
For local development, test in an unsecure context (`http://localhost`) or use the browser's override flags.

#### Solution 2: Reverse Proxy with SSL (Nginx Setup)
To support production-level security, route the tracker traffic through a reverse proxy (like Nginx) that terminates TLS and proxies it to the local tracker:

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
Clients will now connect securely utilizing `wss://tracker.local:8443`.
