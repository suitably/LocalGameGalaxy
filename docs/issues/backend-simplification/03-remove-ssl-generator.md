# Remove SSL Self-Signed Certificate Generator

## Context

Der MelodiQ-Server generiert selbstsignierte SSL-Zertifikate via `node-forge` für HTTPS auf `PORT + 1`. Dies ist überflüssig — SSL/TLS wird vom Reverse Proxy (Pangolin, Nginx, Cloudflare Tunnel etc.) terminiert, nicht vom Applikationsserver. Der optionale Cloudflare Quick Tunnel (in `server/src/core/tunnel.ts`, Hono-Architektur) bleibt für User ohne eigenen Reverse Proxy.

## Aufgabe

Entferne die SSL-Zertifikat-Generierung und den HTTPS-Listener. Der Server läuft nur noch auf HTTP (ein Port).

## Betroffene Dateien

### Backend — Entfernen

- **`server/src/services/ssl.js`** → **gesamte Datei löschen**
  - Enthält: `getHttpsOptions()` — RSA 2048-bit keypair Generierung via `node-forge`, PEM Speicherung in config, TLS cipher suite config
- **`server/index.js`**
  - **Line 3**: `const https = require('https')` → entfernen
  - **Line 7**: `const { getHttpsOptions } = require('./src/services/ssl')` → entfernen
  - **Line 28**: `const SSL_PORT = config.port + 1` → entfernen
  - **Line 47**: `const httpsOptions = getHttpsOptions(config)` → entfernen
  - **Lines 56–75**: Gesamter HTTPS-Server-Block (`https.createServer(...)`) → entfernen. Dieser Block enthält auch den `scanSongs()` Aufruf und `initializeTracker` — diese müssen in den HTTP-Server-Block verschoben werden.
  - **Lines 77–106**: `initializeTracker` — `httpsServer` Parameter entfernen, nur `httpServer` behalten für WebSocket Upgrade

### Backend — Config bereinigen

- **`server/config.js`**
  - **Line 12**: `ssl: null` aus `defaultConfig` → entfernen
  - **Lines 207–214**: `get ssl()` und `set ssl(value)` Getter/Setter → entfernen
- **`server/package.json`**
  - **Line 37**: Dependency `"node-forge": "^1.3.3"` → entfernen
- **`server/public/index.html`**
  - **Line 577**: Instruktionen zu self-signed certificate Warnung → entfernen (wird aber ohnehin in Issue #4 komplett gelöscht)

## ⚠️ Wichtig

- `scanSongs()` wird aktuell im HTTPS-Server-Callback aufgerufen (Line ~68). Diesen Aufruf in den HTTP-Server-Callback verschieben!
- `initializeTracker(httpServer, httpsServer)` muss zu `initializeTracker(httpServer)` werden — nur HTTP WebSocket Upgrade
- Der Cloudflare Quick Tunnel in `server/src/core/tunnel.ts` (Hono-Architektur) ist **nicht betroffen** und bleibt

## Akzeptanzkriterien

- [ ] Server startet nur noch auf HTTP (ein Port)
- [ ] Keine `node-forge` Dependency mehr
- [ ] `ssl` Feld wird nicht mehr in `config.json` geschrieben
- [ ] Library-Scan (`scanSongs()`) wird weiterhin beim Server-Start ausgeführt
- [ ] WebRTC Tracker (bittorrent-tracker) funktioniert weiterhin über HTTP WebSocket
- [ ] `npm run lint` und `npm run build` fehlerfrei (im server/)

## Labels

`melodiq`, `backend`, `cleanup`
