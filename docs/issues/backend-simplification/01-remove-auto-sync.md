# Remove Auto-Sync (Silence Detection)

## Context

MelodiQ hat zwei Ansätze für Lyrics-Synchronisation: **Auto-Sync** (ffmpeg silence detection für `#GAP`-Berechnung) und **Full AI Sync** (Whisper forced alignment). Auto-Sync ist obsolet und wird nicht mehr genutzt. Full AI Sync bleibt.

## Aufgabe

Entferne alle Auto-Sync Funktionalität aus Backend und Frontend. Die Full-Sync (`type: 'full-sync'`) und Stem Separation (`type: 'separate'`) Funktionalität in `separator.js` **muss erhalten bleiben**.

## Betroffene Dateien

### Backend

- **`server/src/services/separator.js`**
  - **Lines 155–158**: Job dispatcher `if (job.type === 'auto-sync')` → entfernen
  - **Lines 338–503**: Gesamte `runAutoSyncJob` Funktion → entfernen
  - **Line 603**: Export von `runAutoSyncJob` → entfernen
- **`server/src/services/queueManager.js`**
  - **Lines 138, 164, 171–172**: `type: 'auto-sync'` Handling in `addSeparatorJobs` → entfernen (Felder `approximateStartSec`, `isPaused`)
- **`server/public/index.html`**
  - **Line 2013**: Auto-Sync Job-Titel-Anzeige → entfernen

### Frontend

- **`src/games/melodiq/components/SongActionDialogs.tsx`**
  - **Line 56**: `activeSepJob?.type === 'auto-sync'` Prüfung → entfernen (nur `'full-sync'` behalten)
  - **Lines 169–200**: `handleAutoSync` und `confirmAutoSync` Funktionen → entfernen
  - **Lines 310–327**: Action-Button "Auto-Sync (Nur Start)" → entfernen
  - **Lines 431–456**: `syncTimeDialogOpen` Dialog (Zeitangabe für approximate start) → entfernen
- **`src/games/melodiq/i18n/index.ts`**
  - **EN Lines 222–228, DE Lines 466–472**: i18n Key `auto_sync_start` → entfernen. Keys `sync_started`, `sync_error`, `sync_completed`, `sync_failed` → **nur entfernen wenn sie nicht von Full-Sync genutzt werden** (prüfen!)

## ⚠️ Nicht anfassen

- `PhoneClientEngine.tsx:146` und `useMelodiqGlobalEvents.tsx:232` — enthalten "auto-sync" nur in Kommentaren über Multiplayer-Session-Sync, nicht Audio-Sync
- `type: 'separate'` und `type: 'full-sync'` Jobs in separator.js — diese bleiben

## Akzeptanzkriterien

- [ ] `auto-sync` taucht nirgends mehr im Code auf (außer Kommentare über Multiplayer-Sync)
- [ ] Stem Separation (`type: 'separate'`) funktioniert weiterhin
- [ ] Full AI Sync (`type: 'full-sync'`) funktioniert weiterhin
- [ ] `npm run lint` und `npm run build` fehlerfrei
- [ ] `npm run check:architecture:diff` fehlerfrei

## Labels

`melodiq`, `backend`, `cleanup`
