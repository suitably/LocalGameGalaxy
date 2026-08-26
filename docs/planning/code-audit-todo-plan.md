# Code Audit & Refactoring TODO [ID: PLAN-AUDIT-2026-08]

> [!IMPORTANT]
> Ergebnis einer vollständigen statischen Analyse der Codebasis (Client + Server).
> **186 console-Statements**, **~250+ `any`-Typen**, **11 Dateien über 250 Zeilen**, **13 Stellen mit Array-Index-Keys**.
> Enthält **2 kritische Sicherheitslücken** im Server.

---

## Legende

| Symbol | Bedeutung |
|--------|-----------|
| 🔴 | **Kritisch** — Bugs, Sicherheitslücken, Datenverlust |
| 🟠 | **Hoch** — Anti-Patterns, SRP-Verletzungen, Architekturprobleme |
| 🟡 | **Mittel** — Code Smells, Inkonsistenzen, DRY-Verletzungen |
| 🔵 | **Niedrig** — Stilfragen, Optimierungspotenzial |
| ✅ | Erledigt |

---

## 1. 🔴 Kritische Sicherheitslücken (Server)

### 1.1 Fehlende Autorisierung auf sensitiven Endpunkten
- [ ] **`server/src/routes/index.js`** (L63-71, L77-89)
  - `POST /api/config/directories`, `DELETE /api/config/directories`, `GET /api/browse`, `POST /api/config/usdb-credentials`, `POST /api/config/github` fehlen `requireMasterToken`-Middleware
  - **Impact:** Jeder Nutzer mit Basic-API-Key kann Server-Verzeichnisse manipulieren und über `GET /api/browse` das gesamte Dateisystem lesen
  - **Fix:** `requireMasterToken` Middleware auf alle Admin-Endpunkte setzen

### 1.2 Lokale Auth-Bypass & Token-Leak
- [ ] **`server/src/controllers/viewController.js`** (L21-37)
  - `isLocal` wird nur anhand `req.socket.remoteAddress` bestimmt
  - Master-Token wird direkt ins HTML injiziert (`let injectedToken = config.token;`)
  - **Impact:** Hinter Reverse-Proxy bekommen externe User Admin-Zugang; DNS-Rebinding-Angriffe extrahieren den Token
  - **Fix:** Token nie in HTML einbetten; stattdessen Login-Flow mit Cookie/Session implementieren

---

## 2. 🔴 Kritische Bugs (Client)

### 2.1 Direkte State-Mutation im Reducer
- [ ] **`src/games/werewolf/logic/gameReducer.ts`** (L125)
  - `state.nightActionLog = victims;` mutiert den Reducer-State direkt
  - **Impact:** React erkennt die Änderung nicht → UI-Updates bleiben aus, Race Conditions
  - **Fix:** Spread-Operator verwenden: `return { ...state, nightActionLog: victims };`

### 2.2 Endlos-Loop durch instabile useEffect-Dependency
- [ ] **`src/games/werewolf/components/DayPhase.tsx`** (L23-32)
  - `killedPlayers` wird per `players.filter(...)` als neue Referenz bei jedem Render erstellt
  - Wird als Dependency in `useEffect` für TTS `speak()` verwendet
  - **Impact:** TTS wird bei jedem Re-Render erneut ausgelöst (Endlosschleife)
  - **Fix:** `killedPlayers` in `useMemo` wrappen oder stabile IDs als Dependency verwenden

### 2.3 useEffect ohne Dependency-Array
- [ ] **`src/games/melodiq/components/PlaybackManager.tsx`** (L191-193)
  - `useEffect` aktualisiert Refs, hat aber kein Dependency-Array → läuft bei **jedem** Render
  - **Fix:** Dependency-Array mit den tatsächlichen Abhängigkeiten ergänzen

---

## 3. 🟠 SRP-Verletzungen (Dateien > 250 Zeilen)

> Laut AGENTS.md-Policy muss jede Datei unter ~250 Zeilen bleiben.

| # | Datei | Zeilen | Refactoring-Vorschlag |
|---|-------|--------|-----------------------|
| [ ] | `src/games/melodiq/MelodiqGame.tsx` | **545** | In `MelodiqSearch`, `MelodiqSession`, `MelodiqQueueView` aufteilen; `useReducer` statt vieler `useState` |
| [ ] | `src/games/werewolf/logic/gameReducer.ts` | **536** | Rollen-spezifische Logik in separate Handler extrahieren (Strategy Pattern) |
| [ ] | `src/lib/webrtc/WebRTCHostManager.ts` | **522** | Signaling, Peer-Management und Message-Deduplication in eigene Klassen trennen |
| [ ] | `src/lib/webrtc/useWebRTCClient.ts` | **476** | Core-Logik in pure TS-Klasse extrahieren; Hook nur für React-State-Bindings |
| [ ] | `src/games/melodiq/components/PlaybackManager.tsx` | **468** | TV-Remote-Logik, Sync-Logik und Mini-Player als eigene Komponenten |
| [ ] | `src/games/werewolf/components/NightPhase.tsx` | **388** | Phasen-Orchestrierung vs. Rollen-UI trennen; `key={currentRoleIndex}` statt manueller State-Resets |
| [ ] | `src/components/connection/DeviceConnection.tsx` | **385** | QR-Code, Advanced Settings, Peer-Liste als Sub-Komponenten |
| [ ] | `src/games/melodiq/PhoneClientEngine.tsx` | **379** | Message-Handler in separaten Hook extrahieren |
| [ ] | `src/games/werewolf/components/GameSetup.tsx` | **351** | `PlayerList`, `GameSettingsPanel`, `RoleConfigSection` extrahieren |
| [ ] | `src/games/melodiq/gameplay/ScoreBoard.tsx` | **~315** | Score-Berechnung in Hook; Anzeige-Logik in Sub-Komponenten |
| [ ] | `src/games/imposter/components/GameSetup.tsx` | **264** | `PlayerList` und `GameSettings` extrahieren |

---

## 4. 🟠 Type-Safety (`any`-Seuche)

> 250+ Vorkommen von `any` in der Codebasis. Top-Offender:

### 4.1 WebRTC-Layer (60 `any`)
- [ ] **`WebRTCHostManager.ts`** (37×) und **`useWebRTCClient.ts`** (23×)
  - `(trackerPeer as any)`, `(peer as any)` um interne Properties anzuhängen
  - **Fix:** `interface ExtendedPeer extends SimplePeer.Instance { _connectionId: string; }` oder `WeakMap<SimplePeer.Instance, PeerMetadata>` verwenden

### 4.2 MelodiQ-Module (~100 `any`)
- [ ] **`MelodiqGame.tsx`** (18×): `useState<any[]>`, Payload-Typen
- [ ] **`useMelodiqGlobalEvents.tsx`** (16×): Event-Handler ohne Typisierung
- [ ] **`useTVMode.ts`** (13×): Message-Payloads
- [ ] **`MelodiqTV.tsx`** (12×): `navigator as any`, `useState<any>`
- [ ] **`useQueue.ts`** (12×), **`useSessionPlayers.ts`** (12×)
- [ ] **`PlaybackManager.tsx`** (10×), **`PhoneClientEngine.tsx`** (9×)
- **Fix:** Shared Message-Typen als Discriminated Union definieren:
  ```typescript
  type MelodiqMessage =
    | { type: 'SONG_SELECTED'; payload: SongMeta }
    | { type: 'SCORE_UPDATE'; payload: ScoreData }
    | { type: 'QUEUE_CHANGE'; payload: QueueState };
  ```

### 4.3 Werewolf-Module
- [ ] **`NightPhase.tsx`** (L268, 273): `ability.type as any`
- [ ] **`BlackWerewolfView.tsx`** (L12), **`SurvivorView.tsx`** (L11): `powerState?: any`
- **Fix:** `powerState` mit konkretem Rollen-Union-Type ersetzen

### 4.4 Imposter
- [ ] **`logic/imposterRepository.ts`** (L23, 27): `seedCategories(any[])`, `seedWordPairs(any[])`
- **Fix:** Concrete Interfaces `Category` und `WordPair` definieren

### 4.5 Shared Components
- [ ] **`DeviceConnection.tsx`**: `peers: any[]`, `renderPeerExtra?: (peer: any) => ReactNode`
- **Fix:** `RemotePeerBase`-Interface einführen

---

## 5. 🟠 Hardcoded Strings (i18n-Verletzungen)

### 5.1 MelodiQ — Deutsche Strings direkt im Code
- [ ] **`MelodiqGame.tsx`**:
  - L153: `'Als Sänger kannst du keine Lieder auswählen.'`
  - L164: `` `Zur Warteschlange hinzugefügt: ${songMeta.title}` ``
  - L238: `` `${selectedSong.title} wurde hinten angestellt.` ``
  - L265/290: `'Nur Queue Manager können Songs herunterladen.'`
  - L283/317: `'Download fehlgeschlagen.'`
- [ ] **`PlaybackManager.tsx`** (L237/251/263): `"Waiting for download to finish..."`

### 5.2 Imposter — Werewolf-Keys statt eigener Keys
- [ ] **`ImposterGame.tsx`** (L227): `t('games.werewolf.play_again')` — falsches Modul!
- [ ] **`GameSetup.tsx`**: `games.werewolf.ui.player_name`, `games.werewolf.ui.add`, `games.werewolf.ui.add_players_hint`
- [ ] **`HandoverView.tsx`** (L33): `t('games.werewolf.reveal_role')`
- **Fix:** Eigenen `games.imposter.*` Namespace erstellen; geteilte Keys nach `common.*` verschieben

### 5.3 Werewolf
- [ ] **`NightPhase.tsx`** (L209): `has finished acting.` (englisch, unübersetzt)
- [ ] **`NightPhase.tsx`** (L257): String-Konkatenation statt i18n-Interpolation

---

## 6. 🟠 React Anti-Patterns

### 6.1 Array-Index-Keys (13 Stellen)
- [ ] `src/components/Layout/GlobalHeader.tsx` (L101, L145)
- [ ] `src/components/connection/DeviceConnection.tsx` (L308)
- [ ] `src/games/werewolf/components/NightPhase.tsx` (L229)
- [ ] `src/games/werewolf/components/DayPhase.tsx` (L142)
- [ ] `src/games/werewolf/components/RoleEditDialog.tsx` (L158)
- [ ] `src/games/imposter/components/GameInfoDialog.tsx` (L41)
- [ ] `src/games/melodiq/gameplay/LyricsDisplay.tsx` (L239, L285)
- [ ] `src/games/melodiq/gameplay/ScoreBoard.tsx` (L315)
- [ ] `src/games/melodiq/components/HistoryDrawer.tsx` (L138)
- [ ] `src/games/melodiq/components/HostQueueDrawer.tsx` (L187, L313)
- **Fix:** Stabile IDs verwenden oder `crypto.randomUUID()` bei der Datenerstellung

### 6.2 DOM-Manipulation statt React-State
- [ ] **`src/App.tsx`** (L24-26): `document.querySelector` + `dispatchEvent('Escape')` für Modal-Schließung
  - **Fix:** Modal-State in Context verwalten; Back-Button per Context steuern
- [ ] **`src/components/Layout/GlobalHeader.tsx`** (L89): `window.dispatchEvent(new Event('feedback:open'))`
  - **Fix:** `useFeedback()` Context-Hook statt globaler DOM-Events

### 6.3 Non-Functional State Updates
- [ ] **`src/games/imposter/ImposterGame.tsx`**: `setGameState({ ...gameState, ... })` statt `setGameState(prev => ({ ...prev, ... }))`
  - **Impact:** Stale Closures bei schnellen State-Updates
  - **Fix:** Immer den funktionalen Updater verwenden

### 6.4 State-Management — Impossible States
- [ ] **`src/games/imposter/ImposterGame.tsx`**: Einzelnes `gameState`-Objekt enthält `timerLength`, `winner`, `selectedWord` gleichzeitig
  - **Fix:** Discriminated Union nach Phase: `{ phase: 'LOBBY' } | { phase: 'PLAYING'; selectedWord: string } | { phase: 'ENDED'; winner: string }`
- [ ] **`src/games/melodiq/MelodiqGame.tsx`**: Viele `useState` für verwandte States (`selectedSong`, `remoteSong`, `restoredSong`, `currentView`)
  - **Fix:** In `useReducer` mit Discriminated Union konsolidieren

---

## 7. 🟡 Server — Mittlere Probleme

### 7.1 Timing-Attack bei Token-Vergleich
- [ ] **`server/src/middleware/auth.js`** (L17-22)
  - Token-Vergleich mit `===` statt `crypto.timingSafeEqual()`
  - **Fix:** `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))` verwenden

### 7.2 Klartext-Secrets
- [ ] **`server/config.js`** (L11-23, L76-83)
  - `config.json` speichert Master-Token, API-Keys, Passwörter im Klartext
  - **Fix:** Tokens hashen (bcrypt/argon2); externe Passwörter verschlüsseln

### 7.3 Synchrone Blocking-Operationen
- [ ] **`server/config.js`** (L76-83): `fs.writeFileSync()` bei jeder Config-Änderung
- [ ] **`server/src/controllers/viewController.js`** (L49-60): `fs.readFileSync()` bei jedem Page-Load
  - **Fix:** Async-Varianten verwenden; HTML-Template cachen

### 7.4 Race Conditions
- [ ] **`server/config.js`**: Synchrones Read-Modify-Write ohne Locking bei parallelen Requests
  - **Fix:** Atomic writes oder Config-Mutex einführen

### 7.5 Memory Leak in Job-Queues
- [ ] **`server/src/services/download.js`** & **`server/src/services/separator.js`**
  - `DOWNLOAD_JOBS` / `SEPARATOR_JOBS` Maps wachsen unbegrenzt
  - **Fix:** TTL-basiertes Cleanup oder max. Queue-Size einführen

### 7.6 Fehlende Input-Validierung
- [ ] **`server/src/controllers/configController.js`** (L159-220): `submitFeedback` limitiert `title`/`body` nicht
  - **Fix:** Maximale Länge validieren und Request-Body-Limit setzen

### 7.7 Veraltete Polyfills
- [ ] **`server/index.js`** (L18-24): `global.TextEncoder` und `global.btoa` Polyfills
  - `btoa` mit `'binary'` Encoding zerstört UTF-8 Multi-Byte-Zeichen
  - **Fix:** Node.js 18+ hat natives `btoa`; Polyfills entfernen

---

## 8. 🟡 Architektur & Modularisierung

### 8.1 WebRTC-Schicht
- [ ] **`WebRTCHostManager.ts`** in 3 Module aufteilen:
  1. `TrackerSignaling.ts` — Tracker-Verbindung und Signaling
  2. `PeerManager.ts` — SimplePeer-Lifecycle-Management
  3. `MessageBus.ts` — Deduplication und Message-Routing
- [ ] **`useWebRTCClient.ts`** umstrukturieren:
  1. `WebRTCClientManager.ts` — Pure TS-Klasse mit Peer-Logik
  2. `useWebRTCClient.ts` — Dünner React-Hook, der die Klasse kapselt

### 8.2 Game-Reducer Modularisierung (Werewolf)
- [ ] **`gameReducer.ts`** (536 Zeilen) aufteilen:
  - `roleHandlers/` Verzeichnis mit je einer Datei pro Rolle
  - `nightPhaseReducer.ts`, `dayPhaseReducer.ts`, `setupReducer.ts`
  - Haupt-Reducer delegiert per Action-Type

### 8.3 i18n-Struktur bereinigen
- [ ] **Doppelte Translation-Dateien**: `src/i18n/locales/imposter.json` existiert, aber `i18n.ts` nutzt `HttpBackend` mit `public/locales/`
  - **Fix:** Dead Code in `src/i18n/locales/` bereinigen oder Migration abschließen

### 8.4 Shared Components extrahieren
- [ ] **`PlayerList`-Komponente**: Sowohl Werewolf- als auch Imposter-`GameSetup` implementieren eigene Spielerlisten
  - **Fix:** Shared `src/components/PlayerList.tsx` erstellen
- [ ] **`useLocalStorage`-Hook**: JSON-Parse/Stringify-Logik mit try/catch wird in `GameSetup` (Werewolf, L38-54) dupliziert
  - **Fix:** `src/hooks/useLocalStorage.ts` Hook erstellen

---

## 9. 🟡 Sonstiges

### 9.1 Debug-Code
- [ ] **186 `console.log/warn/error`-Aufrufe** in `src/`
  - Besonders: `gameReducer.ts` (L519, L526) — `console.log` in Production-Code
  - **Fix:** Logger-Utility mit Environment-Check; oder alle entfernen

### 9.2 Fehlende Error-Handling
- [ ] **Werewolf `GameSetup.tsx`** (L38-44, 48-54): Leere `catch {}`-Blöcke verschlucken JSON-Parse-Fehler
- [ ] **Imposter `ImposterGame.tsx`**: `startGame` gibt bei `pairs.length === 0` still `return` ohne User-Feedback
- [ ] **MelodiQ**: Download-Fehler nur als `setFeedbackMessage`, kein Retry oder Error-State

### 9.3 Imperative Patterns in `main.tsx`
- [ ] **`src/main.tsx`** (L15-30): `initSafeArea()` modifiziert DOM und registriert Capacitor-Listener im Modul-Scope
  - **Impact:** Potenzielle Memory-Leaks, HMR-Probleme
  - **Fix:** In einen `useEffect` innerhalb der Root-Komponente verschieben

### 9.4 Ref-Synchronisation statt Custom Hook
- [ ] **`PhoneClientEngine.tsx`** (L110, 113, 116): Mehrere `useEffect` nur um State→Ref zu synchen
  - **Fix:** `useLatestRef(value)` Custom-Hook erstellen und wiederverwenden

### 9.5 Excessive Storage Writes
- [ ] **Imposter `GameSetup.tsx`**: `storage.setJson` wird bei jeder Änderung von `resolvedImposterCount` ausgelöst
  - **Fix:** Debouncing oder nur bei Blur/Submit speichern

### 9.6 Projekt-Root-Verschmutzung
- [ ] Temporäre/Debug-Dateien im Root-Verzeichnis:
  - `baseline.heapsnapshot` (27 MB), `target.heapsnapshot` (27 MB)
  - `test_bc.js`, `test_leak.cjs`, `test_path.js`, `test_resolve.cjs`, `test_resolve.js`, `test_url.js`
  - `diff.txt`, `lint_output.txt`, `aligned_words.json`, `missing_words.json`, `extract.mjs`
  - **Fix:** `.gitignore` erweitern oder Dateien entfernen

---

## Empfohlene Reihenfolge

| Priorität | Bereich | Aufwand |
|-----------|---------|---------|
| **1** | 🔴 Server-Sicherheitslücken (§1) | Klein — Middleware hinzufügen, Token-Injection entfernen |
| **2** | 🔴 Direkte State-Mutation & useEffect-Bugs (§2) | Klein — Einzelne Zeilen fixen |
| **3** | 🟠 `any`-Typen durch Interfaces ersetzen (§4) | Mittel — Shared Types definieren, dann Module migrieren |
| **4** | 🟠 i18n-Verletzungen beheben (§5) | Mittel — Keys erstellen, Strings ersetzen |
| **5** | 🟠 React Anti-Patterns (§6) | Mittel — Index-Keys, DOM-Events, State-Updates |
| **6** | 🟠 SRP-Refactoring (§3) | Groß — Schrittweise, je ein Modul pro PR |
| **7** | 🟡 Server-Verbesserungen (§7) | Mittel — Security-Hardening, Async-Migration |
| **8** | 🟡 Architektur-Modularisierung (§8) | Groß — WebRTC-Split, Reducer-Split |
| **9** | 🟡 Cleanup & Sonstiges (§9) | Klein — Console-Logs, Debug-Files, Hooks |
