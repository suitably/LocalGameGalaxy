# Code Audit Refactoring – Task Tracking [ID: TASKS-AUDIT-2026-08]

> Plan: [code-audit-refactoring-plan.md](../planning/code-audit-refactoring-plan.md)

## Sprint 1: 🔴 Kritische Bugs & Security

- [x] **K1**: Path Traversal Fix in `server/src/utils/helpers.js`
  - [x] `path.sep` an Verzeichnispfad anhängen in `resolveSecurePath()`
  - [x] Verifizierung: Edge-Case-Test mit ähnlich benannten Verzeichnissen
- [x] **K2**: TV-Sync Time Drift Fix in `usePassiveSync.ts`
  - [x] `!isTVMode` aus der Drift-Korrektur-Bedingung entfernen
  - [x] Verifizierung: TypeScript-Compile check
- [x] **K3**: Audio Playback Race Condition (Host ↔ TV)
  - [x] Drift-Schwelle von 2.0s auf 0.5s gesenkt für schnelle TV-Korrektur
  - [x] K2-Fix ermöglicht TV-Drift-Korrektur → zusammen löst das den initialen Lag
  - [x] Verifizierung: Build + Logik-Review
- [x] **K4**: WebRTC Map-Mutation während Iteration
  - [x] `this.peers` Iteration refactored (collect-then-delete pattern)
  - [x] Verifizierung: Build check

## Sprint 2: 🟠 Performance

- [x] **H1**: Cascading Re-renders in PlaybackManager (100ms→1000ms throttle, isPlaying instant)
- [x] **H2**: Duplizierter Broadcast-Loop entfernt (in handlePlaybackUpdate integriert)
- [x] **H7**: Sync FS → Async FS im Server (songController.js)

## Sprint 3: 🟠 TypeScript & React Patterns

- [x] **H3**: Hooks-als-Props Pattern → WebRTCConnectionData interface + prop data passing
- [x] **H4**: useEffect Dependency Anti-pattern → JSON.stringify für stabile deps
- [x] **H5**: `any`-Typ eliminiert (gameReducer, WitchView → PlayerPowerState)
- [x] **H6**: types.ts bereinigt (hasEGG, isDragonInfected entfernt, Kommentare hinzugefügt)

## Sprint 4: 🟠 Architektur-Bereinigung

- [x] **H8**: Hardware Back Button Overlay-Check in `src/App.tsx` (Schließt geöffnete Dialoge/Drawer vor App-Exit)
- [x] **H9**: Werewolf GameContext (`WerewolfGameContext.tsx`) & Provider eingeführt (Prop-Drilling eliminiert)
- [x] **H10**: Imposter State Deduplication (Klare Trennung `lobbyPlayers` vs active `gameState.players`, Storage-Integration)
- [x] **H11**: Idempotentes DB Seeding mit `seedPromise` Mutex gegen React 18 Strict Mode Concurrent Calls
- [x] **H12**: WebRTC Listener Cleanup (`removeAllListeners`, `stop()` bereinigt alle Listener, `on()` gibt Unsubscribe-Funktion zurück)

## Sprint 5-7: 🟡🟢 Komponenten, i18n, Polish

- [x] **M2, M3**: Server: `requireMasterToken` Middleware & einheitliche JSON-Error-Formate
- [x] **M4, M8, N4**: i18n-Bereinigung (Hardcoded Strings in MelodiQ, Werewolf Interpolation, Imposter i18n & Dialog Rules)
- [x] **M7, M9, M6**: Storage & useEffect-Bereinigung (`WebRTCHostContext.tsx`, `GameSetup.tsx`, `storage.ts`)
- [x] **M1**: God Component `RoleEditor.tsx` aufgeteilt in modulare Subkomponente `RoleEditDialog.tsx`

---

## Statusbericht

| Sprint | Status | Beginn | Abschluss |
|--------|--------|--------|-----------|
| Sprint 1 | [x] Abgeschlossen | 2026-08-16 | 2026-08-16 |
| Sprint 2 | [x] Abgeschlossen | 2026-08-16 | 2026-08-16 |
| Sprint 3 | [x] Abgeschlossen | 2026-08-16 | 2026-08-16 |
| Sprint 4 | [x] Abgeschlossen | 2026-08-16 | 2026-08-16 |
| Sprint 5-7 | [x] Abgeschlossen | 2026-08-16 | 2026-08-16 |
