# Migrate Express.js Server to Hono

## Context

Nach Abschluss der Cleanup-Issues #1–#6 soll der verbleibende Express.js Server (`server/index.js`) zu **Hono** migriert werden. Es existiert bereits ein Hono Micro-Kernel in `server/src/index.ts` mit Plugin-System (`server/src/core/`). Hono ist TypeScript-native, multi-runtime-fähig (Node, Bun, Cloudflare Workers) und besser für einen Docker One-Click-Server geeignet.

## Voraussetzungen

> ⚠️ Issues #1–#6 (Cleanup) müssen abgeschlossen sein, bevor diese Migration beginnt.

## Aufgabe

Migriere alle verbleibenden Express-Endpoints und Services in das Hono-Plugin-System. Der Express-Server (`server/index.js`) wird durch den Hono-Server (`server/src/index.ts`) ersetzt.

## Verbleibende Endpoints nach Cleanup (zu migrieren)

### Songs & Library
- `GET /api/songs` — Paginated song list mit Suche/Filter
- `GET /api/songs/:id` — Single song mit full metadata + lyrics
- `DELETE /api/songs/:id` — Delete song + cleanup Dateien
- `PUT /api/songs/:id/txt` — Update UltraStar .txt lyrics
- `POST /api/songs/:id/video` — Upload video file (multer)
- `POST /api/songs/refresh` — Trigger library rescan
- `GET /api/status` — Server status + song count
- `GET /api/auth/me` — Auth check + capabilities

### Media
- `GET /media` — Stream lokale Media-Dateien (mit `resolveSecurePath` Security)

### USDB & Download
- `GET /api/usdb/search` — USDB song search (Proxy mit Cookie-Auth)
- `POST /api/usdb/download` — Download song von USDB + YouTube
- `GET /api/usdb/jobs` — List download jobs
- `GET /api/usdb/status/:jobId` — Single job status
- `DELETE /api/usdb/jobs/:jobId?` — Clear/cancel jobs
- `GET /api/youtube/search` — YouTube video search (via yt-dlp)

### Separator
- `GET /api/separator/status` — Installation status
- `POST /api/separator/install` — Install Python deps
- `GET /api/separator/jobs` — List separator jobs
- `GET /api/separator/status/:jobId` — Single job status
- `DELETE /api/separator/jobs/:jobId?` — Clear/cancel jobs
- `POST /api/separator/job` — Start separation (`type: 'separate'`) oder full-sync (`type: 'full-sync'`)

### Config
- `GET/POST /api/config/apikeys`, `PUT/DELETE /api/config/apikeys/:id` — API Key CRUD
- `GET/POST /api/config/usdb-credentials` — USDB Login
- `GET/POST /api/config/directories`, `DELETE /api/config/directories` — Library-Ordner
- `GET/POST /api/config/download-dir` — Download-Verzeichnis
- `GET/POST /api/config/preferences` — Server-Preferences
- `GET /api/browse` — Dateisystem-Browser
- `POST /api/feedback` — GitHub Issue erstellen

### Playlists
- `GET /api/playlists` — Alle Playlists
- `POST /api/playlists` — Playlist erstellen/aktualisieren
- `DELETE /api/playlists/:id` — Playlist löschen

## Ziel-Architektur

```
server/src/
├── index.ts                    # Hono entry (bereits vorhanden, erweitern)
├── config.ts                   # [NEU] Config management (migriert von config.js)
├── core/
│   ├── app.ts                  # createGalaxyServer (bereits vorhanden)
│   ├── pluginLoader.ts         # Plugin registry (bereits vorhanden)
│   ├── tunnel.ts               # Cloudflare Tunnel (bereits vorhanden)
│   └── types.ts                # Shared types (erweitern)
├── plugins/
│   ├── melodiq/
│   │   ├── index.ts            # Plugin entry — mountet alle Routes
│   │   ├── routes/
│   │   │   ├── songs.ts        # /api/songs/* Endpoints
│   │   │   ├── media.ts        # /media Endpoint
│   │   │   ├── usdb.ts         # /api/usdb/* + /api/youtube/* Endpoints
│   │   │   ├── separator.ts    # /api/separator/* Endpoints
│   │   │   ├── config.ts       # /api/config/* Endpoints
│   │   │   └── playlists.ts    # /api/playlists/* Endpoints
│   │   ├── services/           # Migrierte JS → TS Services
│   │   │   ├── scanner.ts      # Song library scanning + UltraStar parsing
│   │   │   ├── download.ts     # yt-dlp download orchestration
│   │   │   ├── usdb.ts         # USDB scraping + auth
│   │   │   ├── separator.ts    # AI stem separation + Whisper alignment
│   │   │   ├── playlists.ts    # Playlist persistence
│   │   │   └── queueManager.ts # Job queue dispatcher
│   │   └── middleware/
│   │       └── auth.ts         # Bearer Token Auth (Hono middleware)
│   └── relay/                  # WebRTC Relay (bereits vorhanden)
├── utils/
│   └── http.ts                 # HTTP client utils (migriert)
└── worker.ts                   # Cloudflare Workers entry (bereits vorhanden)
```

## Express → Hono API Mapping

| Express | Hono |
|:---|:---|
| `req.query.xxx` | `c.req.query('xxx')` |
| `req.params.xxx` | `c.req.param('xxx')` |
| `req.body` | `await c.req.json()` |
| `res.json(data)` | `return c.json(data)` |
| `res.status(404).json(...)` | `return c.json(..., 404)` |
| `res.sendFile(path)` | `return c.body(readStream, 200, headers)` |
| `res.redirect(url)` | `return c.redirect(url)` |
| `res.text('...', 404)` | `return c.text('...', 404)` |
| `express.Router()` | `new Hono()` |
| `app.use(middleware)` | `app.use('*', middleware)` |
| `req.isMasterToken` | `c.get('isMasterToken')` (via Hono context variables) |

## Migrations-Hinweise

1. **JS → TS**: Alle Services von `.js` zu `.ts` konvertieren. `any` durch konkrete Typen/Interfaces ersetzen. Nutze das bestehende `server/src/core/types.ts` und erweitere es.

2. **Auth Middleware**: Express `req.isMasterToken` → Hono Context Variable `c.set('isMasterToken', true)` / `c.get('isMasterToken')`. Erstelle ein typisiertes `Env` Interface:
   ```ts
   type Env = {
     Variables: {
       isMasterToken: boolean;
       apiKey?: ApiKey;
     }
   };
   ```

3. **File Uploads**: `multer` → Hono's `c.req.parseBody()` oder `@hono/multer`. Betrifft `POST /api/songs/:id/video`.

4. **Static Files**: Nicht mehr nötig (Admin-UI ist in Issue #4 entfernt).

5. **Config**: `server/config.js` (CommonJS + Proxy-Getter/Setter) → `server/src/config.ts` (TypeScript class oder module).

6. **bittorrent-tracker**: WebSocket Upgrade mit `@hono/node-server`. Prüfe `server.on('upgrade', ...)` Kompatibilität. Der `@hono/node-server` `serve()` gibt ein `http.Server` zurück, auf dem man WebSocket Upgrade registrieren kann.

7. **Bestehender Hono melodiq Plugin**: `server/src/plugins/melodiq/index.ts` hat aktuell nur minimale Song-List/Stream-Endpoints (63 Zeilen). Dieser wird durch die vollständige Migration **ersetzt**.

8. **Express-spezifische Dateien die danach gelöscht werden**:
   - `server/index.js` — Express entry point
   - `server/src/routes/index.js` — Express router
   - `server/src/routes/playlists.js` — Express playlist router
   - `server/src/controllers/*.js` — alle Express controller
   - `server/src/middleware/auth.js` — Express auth middleware
   - `server/config.js` — CommonJS config

## Akzeptanzkriterien

- [x] `server/index.js` (Express) existiert nicht mehr
- [x] Server startet via `server/src/index.ts` (Hono)
- [x] Alle Endpoints funktionieren identisch (gleiche Request/Response Formate)
- [x] Alle Services sind TypeScript (`.ts` statt `.js`)
- [x] Kein `any` in neuen TypeScript-Dateien
- [x] Auth Middleware funktioniert (Master Token + API Keys mit Capabilities)
- [x] File Upload (`POST /api/songs/:id/video`) funktioniert
- [x] WebRTC Tracker Signaling funktioniert über WebSocket
- [x] Cloudflare Tunnel (optional) funktioniert
- [x] Frontend kann sich verbinden und alle Funktionen nutzen (Songs, Downloads, Separation, Config)
- [x] `npm run build` (server) fehlerfrei
- [x] Keine Express-Dependencies mehr in `package.json` (`express`, `morgan`, `helmet`, `cors` als Express-Middleware)

## Labels

`melodiq`, `backend`, `migration`, `breaking`
