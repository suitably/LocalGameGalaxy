# Move GuessArt Catalogue Publisher to Frontend-Only

## Context

Der MelodiQ-Server hat einen Endpoint `POST /api/guessart/publish-catalogue`, der über die GitHub REST API einen Branch erstellt, `defaultLexicon.ts` committed und einen PR öffnet. Das ist **keine MelodiQ-Funktionalität** und gehört nicht in den MelodiQ-Server.

Das Frontend kann die GitHub API **direkt** aufrufen — der Mechanismus existiert bereits in `src/games/guessart/logic/catalogueManager.ts`:
- **Strategy 1** (Lines 352–378): Direct GitHub API Call via `createGitHubPR` — nutzt einen lokalen GitHub PAT
- **Strategy 2** (Lines 380–406): Fallback Server Proxy via `POST /api/guessart/publish-catalogue`

Strategy 1 wird zum einzigen Weg. Strategy 2 (Server Proxy) wird entfernt.

## Aufgabe

1. Entferne den Server-Endpoint `POST /api/guessart/publish-catalogue`
2. Entferne den Server-Fallback (Strategy 2) im Frontend `catalogueManager.ts`
3. Stelle sicher, dass der Frontend-Direct-GitHub-Ansatz (Strategy 1) der einzige Publishier-Weg ist
4. Prüfe ob `getGithubConfig` / `setGithubConfig` Server-Endpoints noch für Feedback gebraucht werden

## Betroffene Dateien

### Backend — Entfernen

- **`server/src/controllers/configController.js`**
  - **Lines 223–348**: `publishGuessArtCatalogue` Funktion → entfernen
  - **Line 368**: Export → entfernen
- **`server/src/routes/index.js`**
  - **Lines 99–100**: `router.post('/api/guessart/publish-catalogue', ...)` → entfernen

### Frontend — Anpassen

- **`src/games/guessart/logic/catalogueManager.ts`**
  - **Lines 380–406**: Strategy 2 (Server Proxy Fallback `POST ${cleanBaseUrl}/api/guessart/publish-catalogue`) → entfernen
  - Strategy 1 (Lines 352–378, Direct GitHub via `createGitHubPR`) wird zum einzigen Weg
  - Ggf. Error-Handling anpassen: wenn Strategy 1 fehlschlägt, klar kommunizieren dass ein GitHub PAT benötigt wird

### Backend Config — Evaluieren

- **`server/config.js`**
  - `githubOwner`, `githubRepo`, `githubToken` — prüfen ob diese noch für `submitFeedback` (`POST /api/feedback`) gebraucht werden
  - Falls ja: behalten
  - Falls nur für Catalogue Publisher: entfernen
- **`server/src/controllers/configController.js`**
  - **Lines 140–156**: `getGithubConfig` (`GET /api/config/github`) und `setGithubConfig` (`POST /api/config/github`) — prüfen ob noch für Feedback benötigt, sonst entfernen
  - **Lines 159–220**: `submitFeedback` (`POST /api/feedback`) — prüfen ob das Frontend diese Route noch nutzt oder ob Feedback direkt via GitHub API geht (wie im Catalogue Publisher)

## Akzeptanzkriterien

- [x] Kein `/api/guessart/*` Endpoint mehr im Server
- [x] GuessArt Katalog-Publishing funktioniert weiterhin via Direct GitHub API im Frontend
- [x] Kein Server-Fallback mehr in `catalogueManager.ts`
- [x] Wenn GitHub Config Endpoints noch für Feedback gebraucht werden: diese bleiben. Sonst entfernen. (Evaluierung: Feedback nutzt `server/config.js` direkt; `getGithubConfig`/`setGithubConfig` unbenutzt und entfernt; Server-Feedback & GitHub-Config-Felder beibehalten)
- [x] `npm run lint` und `npm run build` fehlerfrei

## Labels

`melodiq`, `backend`, `cleanup`, `guessart`
