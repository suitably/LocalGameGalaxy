# Simplify Authentication — Remove Rate Limiting

## Context

Der MelodiQ-Server hat ein komplexes API-Key-System mit granularen Rate Limits (`rateLimitSecond`, `rateLimitMinute`, `rateLimitHour`) und Capabilities (`allowManagement`, `allowSongDeletion`) pro Key. Die Rate Limits sind Overengineering und machen die App im schlimmsten Fall unbrauchbar.

**Was bleibt**: Master Token + API Keys mit `name`, `token`, `allowManagement`, `allowSongDeletion`
**Was wegfällt**: Rate Limiting, `express-rate-limit` Dependency, `disableRateLimit` Config-Flag

Das `ServerAdminPanel.tsx` im Frontend verwaltet bereits API Keys mit Capabilities — es hat keine Rate-Limit-UI.

## Aufgabe

1. Entferne `express-rate-limit` Dependency und Middleware
2. Entferne Rate-Limit-Felder aus API Keys (`rateLimitSecond`, `rateLimitMinute`, `rateLimitHour`)
3. Behalte: Master Token, API Keys mit `name`, `token`, `allowManagement`, `allowSongDeletion`
4. Entferne `disableRateLimit` Config-Flag

## Betroffene Dateien

### Backend

- **`server/src/middleware/auth.js`**
  - **Lines 117–156**: Gesamte `rateLimitMiddleware` Funktion und `createLimiter` → entfernen
  - **Lines 28–35**: `requireAuth` — API Key Validierung behalten, Rate-Limit-Felder ignorieren
  - **Lines 43–48**: `requireMasterToken` — bleibt unverändert
  - Rate-Limit-bezogene Imports (z.B. `express-rate-limit`) → entfernen
- **`server/index.js`**
  - Rate-Limit-Middleware Import → entfernen
  - **Line 41 (ca.)**: `rateLimitMiddleware` Registrierung im Middleware-Stack → entfernen
- **`server/config.js`**
  - **Line 13**: `disableRateLimit: false` aus `defaultConfig` → entfernen
  - **Lines 216–218**: `disableRateLimit` Getter/Setter → entfernen
  - **Lines 238–298**: `createApiKey(name, rateLimits, allowManagement, allowSongDeletion)` — Rate-Limit-Parameter entfernen. Signatur wird: `createApiKey(name, allowManagement, allowSongDeletion)`
  - `updateApiKey` — Rate-Limit-Felder aus Updates entfernen
- **`server/src/controllers/configController.js`**
  - **Lines 101–137**: `createApiKey` Controller — Rate-Limit-Parameter aus `req.body` Destructuring entfernen
- **`server/package.json`**
  - **Line 30**: Dependency `"express-rate-limit": "^8.2.1"` → entfernen
- **`server/public/index.html`**
  - **Lines 675–677, 728–835**: Rate-Limit UI — wird ohnehin in Issue #4 gelöscht, aber bei separater Bearbeitung hier auch entfernen

### Frontend

- **`src/components/connection/ServerAdminPanel.tsx`**
  - **Lines 28–38**: `ApiKey` TypeScript Interface — prüfen ob Rate-Limit-Felder vorhanden, falls ja entfernen
  - Der Rest der UI nutzt nur `allowManagement` und `allowSongDeletion` — sollte ohne Änderung funktionieren

## Akzeptanzkriterien

- [ ] Keine `express-rate-limit` Dependency mehr in `server/package.json`
- [ ] API Keys haben keine Rate-Limit-Felder mehr (`rateLimitSecond`, `rateLimitMinute`, `rateLimitHour`)
- [ ] `disableRateLimit` Flag existiert nicht mehr in Config
- [ ] Master Token Authentifizierung funktioniert weiterhin
- [ ] API Key Capabilities (`allowManagement`, `allowSongDeletion`) funktionieren weiterhin
- [ ] `ServerAdminPanel.tsx` im Frontend funktioniert weiterhin (Keys erstellen, bearbeiten, löschen)
- [ ] `npm run lint` und `npm run build` fehlerfrei

## Labels

`melodiq`, `backend`, `cleanup`
