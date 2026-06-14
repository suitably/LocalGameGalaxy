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
- **`package.json`**: `bittorrent-tracker` hinzufügen.
- **`index.js`**: Tracker Server instanziieren und an den HTTP/HTTPS Server binden.

### Frontend / Client (`src/`)
- **`src/games/melodiq/phone-client.ts`**: Öffentliche Tracker entfernen.
- **`src/components/connection/DeviceConnection.tsx`**: QR-Code um lokalen WSS-Pfad ergänzen.

## Verification Plan
1. Server und Host starten.
2. Prüfen ob WSS-Verbindung zum lokalen Tracker via `wss://<ip>:3001` aufgebaut wird.
3. Erfolgreiche WebRTC Verbindung zwischen Phone und Host bestätigen.
