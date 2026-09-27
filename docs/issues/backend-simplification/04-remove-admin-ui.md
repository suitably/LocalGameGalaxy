# Remove Separate Admin UI (`public/index.html`)

## Context

Das MelodiQ-Backend hat eine eigenständige Admin-Oberfläche in `server/public/index.html` (~2.065 Zeilen monolithisches HTML/CSS/JS). Diese beinhaltet: Directory Management, Song-Scanning, USDB-Suche, Download-Jobs, Vocal Separation Jobs, API-Key-Management, GitHub Config. **Alle diese Funktionen existieren bereits im React-Frontend oder werden dorthin migriert** (siehe Issue #8: Frontend Server Config UI). Die separate Admin-UI wird komplett entfernt.

## Aufgabe

Entferne die eigenständige Admin-UI und den zugehörigen View-Controller. Der Server liefert nur noch JSON-APIs aus, keine HTML-Seiten mehr.

## Betroffene Dateien

### Backend — Entfernen

- **`server/public/index.html`** → **löschen** (~2.065 Zeilen, monolithische Admin-UI)
- **`server/public/login.html`** → **löschen** (36 Zeilen, Token-Login-Formular)
- **`server/public/nexumia-icon.svg`** → **löschen**
- **`server/src/controllers/viewController.js`** → **gesamte Datei löschen**
  - Enthält: `renderMainView` — Template-Variable-Injection (`{{AUTH_TOKEN}}`, `{{SONG_COUNT}}`, etc.), localhost Auto-Auth, Login-Redirect
  - Diese Template-Variablen werden nicht mehr benötigt — das Frontend holt sich alle Informationen über `GET /api/status`

### Backend — Anpassen

- **`server/index.js`**
  - **Line 38**: `app.use(express.static(path.join(__dirname, 'public'), { index: false }))` → entfernen
- **`server/src/routes/index.js`**
  - **Line 17**: `const viewController = require('../controllers/viewController')` → entfernen
  - **Line 49**: `router.get('/', viewController.renderMainView)` → ersetzen durch:
    ```js
    router.get('/', (req, res) => res.json({
      name: 'MelodiQ Server',
      version: '2.0.0',
      status: 'running'
    }));
    ```

## ⚠️ Hinweis

- Das `server/public/` Verzeichnis kann komplett entfernt werden (alle 3 Dateien)
- Alle `/api/*` Endpoints bleiben unverändert — nur die HTML-Auslieferung wird entfernt
- Config-Endpoints (`/api/config/directories`, `/api/config/usdb-credentials`, etc.) die bisher nur von der Admin-UI genutzt wurden, bleiben bestehen — sie werden in Issue #8 vom React-Frontend aufgerufen

## Was bereits im React-Frontend existiert

| Funktion | Frontend-Komponente | Status |
|:---|:---|:---:|
| API Key Management | `src/components/connection/ServerAdminPanel.tsx` | ✅ vorhanden |
| Server Connection | `src/components/connection/ServerConnection.tsx` | ✅ vorhanden |
| Download Job Monitoring | `src/games/melodiq/hooks/useDownloads.ts` | ✅ vorhanden |
| Song Actions (Delete, Re-Download, Separation) | `src/games/melodiq/components/SongActionDialogs.tsx` | ✅ vorhanden |
| Directory Management | — | ❌ wird in Issue #8 gebaut |
| USDB Credentials | — | ❌ wird in Issue #8 gebaut |
| Server Preferences | — | ❌ wird in Issue #8 gebaut |

## Akzeptanzkriterien

- [ ] `GET /` liefert JSON statt HTML
- [ ] Kein `public/` Verzeichnis mehr im Server
- [ ] Kein `viewController.js` mehr
- [ ] Kein `express.static` für `public/` mehr
- [ ] Alle API-Endpoints (`/api/*`) funktionieren weiterhin unverändert
- [ ] `npm run lint` und `npm run build` fehlerfrei

## Labels

`melodiq`, `backend`, `cleanup`
