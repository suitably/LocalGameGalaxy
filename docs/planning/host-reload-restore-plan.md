# Host Reload: Session Restore Feature

## Goal Description

Wenn der Host die Seite neu lädt, soll der zuletzt gespielte Song wiederhergestellt werden:
- Der **MiniPlayer** erscheint am unteren Rand mit dem letzten Song (Title, Artist)
- Ein **"Resume"-Button** (statt Play/Pause) ermöglicht die Wiedergabe fortzusetzen
- Die **Queue** ist weiterhin sichtbar (bereits funktioniert via localStorage)

Der Song spielt **nicht automatisch** – der Nutzer muss bewusst Resume klicken.

## User Review Required

> [!IMPORTANT]
> Der `nowPlaying`-Zustand wird bereits in `localStorage` als `melodiq_now_playing` gespeichert (via `useQueue`). Das ist der Schlüssel für diese Funktion – wir nutzen ihn nur noch nicht beim Host-Mount.

> [!NOTE]
> Da beim Reload die Audiodatei neu geladen werden muss (keine gespeicherten Offsets), startet der Song von vorn. Der Fortschrittsbalken im MiniPlayer wird beim Restore auf 0 gesetzt.

## Proposed Changes

### MelodiqGame / State Restoration

#### [MODIFY] [MelodiqGame.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/MelodiqGame.tsx)

- Beim Mount: `nowPlaying` aus `useQueue` lesen (bereits reaktiv)
- `restoredSong: SongMeta | null` als State einführen, der auf `nowPlaying` initialisiert wird **wenn** `selectedSong === null` und `remoteSong === null`
- Wenn `nowPlaying` beim Mount vorhanden ist: `restoredSong` setzen → MiniPlayer zeigt diesen Song
- `restoredSong` zurückgeben an `PlaybackManager` als Prop

---

### PlaybackManager / MiniPlayer Restore-Logik

#### [MODIFY] [PlaybackManager.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/components/PlaybackManager.tsx)

- Neues Prop: `restoredSong: SongMeta | null`
- Wenn `selectedSong === null && remoteSong === null && restoredSong !== null`: MiniPlayer mit `restoredSong` anzeigen und `isRestored={true}` übergeben
- Im `onTogglePlay` Handler: wenn `isRestored` → `onSelectSong(restoredSong, true)` aufrufen statt normaler Toggle-Logik

#### [MODIFY] [MiniPlayer.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/components/MiniPlayer.tsx)

- Neues Prop: `isRestored?: boolean`
- Wenn `isRestored === true`: statt Play/Pause-Button → **Resume-Button** mit `PlayCircleOutlineIcon`
- Optionales visuelles Label "Fortsetzen" im Song-Info-Bereich

---

### Clearing Logic

#### [MODIFY] [MelodiqGame.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/MelodiqGame.tsx)

- `restoredSong` wird zu `null` gesetzt sobald `selectedSong` oder `remoteSong` gesetzt werden
- `onExitSession` löscht bereits `nowPlaying` via `setNowPlaying(null)` im PlaybackManager

## Verification Plan

### Manual Verification
1. Song starten → minimieren → Seite neu laden
2. MiniPlayer erscheint mit Song-Infos und Resume-Button
3. Queue ist noch sichtbar (Queue-Badge zeigt korrekte Anzahl)
4. Resume klicken → Song startet von vorne, normaler Wiedergabemodus
5. Song vollständig beenden → Reload → kein MiniPlayer (nowPlaying wurde gelöscht)
