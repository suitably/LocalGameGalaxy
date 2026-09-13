# Frontend — Server Config Management UI

## Context

Nach Entfernung der Admin-UI (`server/public/index.html`, Issue #4) fehlen im React-Frontend folgende Verwaltungsfunktionen, die aktuell **nur** über die alte Admin-UI erreichbar waren:

1. **Library Directories** — Ordner hinzufügen/entfernen die gescannt werden
2. **Download-Verzeichnis** — Wohin neue Songs heruntergeladen werden
3. **USDB Credentials** — Username/Password für USDB
4. **Server Preferences** — `defaultDownloadMode`, `autoVocalSeparation`
5. **Directory Browser** — Server-Dateisystem durchsuchen (Ordner-Picker auf dem Server)

### Bereits im Frontend vorhanden (NICHT neu bauen)

| Funktion | Komponente | Pfad |
|:---|:---|:---|
| API Key Management | `ServerAdminPanel.tsx` | `src/components/connection/ServerAdminPanel.tsx` |
| Server Connection (URL + Token) | `ServerConnection.tsx` | `src/components/connection/ServerConnection.tsx` |
| Docker Setup Wizard | `ServerSetupWizard.tsx` | `src/components/connection/ServerSetupWizard.tsx` |
| Download/Separation Job Monitoring | `useDownloads.ts` | `src/games/melodiq/hooks/useDownloads.ts` |
| Song Actions | `SongActionDialogs.tsx` | `src/games/melodiq/components/SongActionDialogs.tsx` |

## Aufgabe

Baue die fehlenden Config-Verwaltungsfunktionen als React-Komponenten und integriere sie in die MelodiQ Settings.

## Backend-Endpoints (bereits vorhanden, werden aufgerufen)

```
GET    /api/config/directories        → { directories: string[] }
POST   /api/config/directories        → { path: string } → Ordner hinzufügen
DELETE /api/config/directories        → { path: string } → Ordner entfernen

GET    /api/browse?path=/some/dir     → { entries: [{ name, isDir, path }] }

GET    /api/config/download-dir       → { downloadDir: string | null }
POST   /api/config/download-dir       → { path: string }

GET    /api/config/usdb-credentials   → { username: string | null, hasPassword: bool }
POST   /api/config/usdb-credentials   → { username: string, password: string }

GET    /api/config/preferences        → { defaultDownloadMode, autoVocalSeparation }
POST   /api/config/preferences        → { key: value, ... }
```

## Vorgeschlagene Komponenten-Struktur

```
src/components/connection/
├── ServerAdminPanel.tsx            # (bestehend, 621 Zeilen) — API Keys
├── ServerConnection.tsx            # (bestehend, 317 Zeilen) — URL + Token
├── ServerSetupWizard.tsx           # (bestehend, 215 Zeilen) — Docker Setup
├── ServerDirectoryManager.tsx      # [NEU] — Library Directories + Download Dir
├── ServerDirectoryBrowser.tsx      # [NEU] — Dateisystem-Browser Dialog
├── ServerUsdbConfig.tsx            # [NEU] — USDB Credentials
└── ServerPreferences.tsx           # [NEU] — Download Mode, Auto Separation
```

### Integration in Settings

Diese Komponenten werden in `MelodiqSettings.tsx` (oder dem entsprechenden Settings-Bereich) eingebunden, nur sichtbar wenn ein Server verbunden ist (`storage.isHelperActive()`).

## Komponenten-Beschreibungen

### `ServerDirectoryManager.tsx` [NEU]
- Zeigt Liste der gescannten Library-Ordner
- "Ordner hinzufügen" Button → öffnet `ServerDirectoryBrowser` Dialog
- "Ordner entfernen" Button pro Eintrag (mit Bestätigung via `ConfirmDialog`)
- Zeigt aktuelles Download-Verzeichnis mit Änderungsmöglichkeit
- Calls: `GET/POST/DELETE /api/config/directories`, `GET/POST /api/config/download-dir`

### `ServerDirectoryBrowser.tsx` [NEU]
- MUI Dialog mit Dateisystem-Browser
- Zeigt Ordner-Hierarchie vom Server (`GET /api/browse?path=...`)
- Navigation: Klick auf Ordner navigiert tiefer, Breadcrumb für zurück
- "Auswählen" Button bestätigt den gewählten Pfad
- Calls: `GET /api/browse`

### `ServerUsdbConfig.tsx` [NEU]
- Zwei Textfelder: USDB Username + Password
- "Testen & Speichern" Button
- Status-Anzeige (gespeichert/nicht gespeichert)
- Calls: `GET/POST /api/config/usdb-credentials`

### `ServerPreferences.tsx` [NEU]
- Toggle: `autoVocalSeparation` (bool) — automatisch Stems trennen nach Download
- Select: `defaultDownloadMode` (`'stream'` | `'mp4'` | `'none'`) — Video-Download-Modus
- Calls: `GET/POST /api/config/preferences`

## Projekt-Regeln (aus AGENTS.md)

- **Max 250 Zeilen** pro `.tsx` Komponente
- **i18n**: Alle UI-Strings über `t('key')` — EN und DE Translation-Dateien pflegen
- **MUI Komponenten** verwenden (Dialog, TextField, Button, List, Switch, Select, etc.)
- **Kein `any`** — typisierte Props und Interfaces
- **Storage** über `src/lib/storage.ts` mit `STORAGE_KEYS`
- **Dialogs** über MUI `<Dialog>` oder `ConfirmDialog`
- **API-Calls** über `melodiqFetch` (`src/games/melodiq/api/melodiqFetch.ts`) für Auth-Token-Injection

## Akzeptanzkriterien

- [ ] Library-Ordner können im Frontend hinzugefügt und entfernt werden
- [ ] Download-Verzeichnis kann im Frontend gesetzt werden
- [ ] Server Directory Browser funktioniert für Ordner-Auswahl
- [ ] USDB-Credentials können im Frontend eingegeben und getestet werden
- [ ] Server-Preferences (Download Mode, Auto Separation) können geändert werden
- [ ] Alle Komponenten nur sichtbar wenn Server verbunden
- [ ] Alle neuen Strings in EN und DE i18n-Dateien
- [ ] Alle Komponenten < 250 Zeilen
- [ ] `npm run check:budget`, `npm run lint`, `npm run build` fehlerfrei
- [ ] `npm run check:architecture:diff` fehlerfrei

## Labels

`melodiq`, `frontend`, `feature`
