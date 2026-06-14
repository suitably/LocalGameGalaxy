# WSS Integration into Helper Server

Diese Erweiterung integriert den WebRTC-Signaling-Server (über `bittorrent-tracker`) direkt in den bestehenden Node.js Helper Server. 

## Hintergrund
Derzeit verbindet sich der Phone-Client mit dem Host über einen öffentlichen Signaling-Server (`wss://tracker.openwebtorrent.com`). Das funktioniert, bringt aber Nachteile mit sich:
- Abhängigkeit von einer Internetverbindung und einem Drittanbieter-Server.
- Höhere Latenz beim initialen Verbindungsaufbau.
- Mögliche Ausfälle, falls der öffentliche Tracker überlastet ist.

## Ziel
Da der Helper Server ohnehin im lokalen Netzwerk läuft (über HTTP und HTTPS), ist es sehr sinnvoll, den WebSocket-Signaling-Server dort direkt anzuhängen. Dadurch bleibt die komplette Smartphone-zu-PC Verbindung im lokalen Netzwerk (vollständig offline-fähig), wird schneller und stabiler.

## Proposed Changes

### Helper Server (`server/`)
- **`package.json`**: Done (already contains `bittorrent-tracker` dependency).
- **`index.js`**:
  - Add `express.static` serving of the `public` directory (with `index: false` to allow fallback to dynamic `/` route) before `requireAuth` to make sure static assets like JS/CSS are served without authorization headers.
  - Dynamically import `bittorrent-tracker` on server startup.
  - Instantiate `TrackerServer` with `{ http: false, udp: false, ws: { noServer: true } }`.
  - Bind to the `upgrade` event of both `httpServer` and `httpsServer` to route WebSocket requests to `tracker.ws.handleUpgrade`.

### Frontend / Client (`src/`)
- **`src/games/melodiq/phone-client.ts`**:
  - Update to parse the `tracker` query parameters from the URL, allowing the host to dynamically tell the phone client which local/remote signaling servers to use.
- **`src/lib/webrtc/WebRTCHostContext.tsx`**:
  - Inject the current local signaling URL (both `ws://` and `wss://` versions based on current browser URL or dynamically resolved LAN IP) into `trackerUrls` so that the host automatically announces itself on the helper's embedded tracker.
- **`src/components/connection/DeviceConnection.tsx`**:
  - Make sure the generated QR code/link contains the local secure tracker URL.

## Verification Plan
1. Start helper server and verify static assets are served on port 3000/3001.
2. Confirm tracker initializes and listens on `upgrade` event.
3. Test local client connections via dynamically injected LAN IP secure WSS tracker url.

ID: WSS-INTEGRATION-PLAN

