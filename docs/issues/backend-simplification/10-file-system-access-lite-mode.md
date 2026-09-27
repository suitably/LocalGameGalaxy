# File System Access API — Lite-Modus (kein Server nötig)

## Context

MelodiQ soll in **drei Stufen** funktionieren:
1. **Lite-Modus** (Browser-only) — User öffnet lokalen Song-Ordner per File System Access API
2. **Lokales Programm** — Server läuft auf localhost
3. **Remote Server** — Server irgendwo gehostet

Der Lite-Modus ermöglicht Karaoke **ohne jeglichen Server**: Songs abspielen, Queue verwalten, Scores speichern, Playlists. Features die einen Server brauchen (Download, USDB-Suche, Stem Separation, AI Sync, Multi-User) sind im Lite-Modus nicht verfügbar.

## Aufgabe

Implementiere den Browser-only Lite-Modus mit `showDirectoryPicker()` (File System Access API).

## Funktionsumfang Lite-Modus

| Feature | Verfügbar | Wie |
|:---|:---:|:---|
| Songs laden & durchsuchen | ✅ | `showDirectoryPicker()` → UltraStar `.txt` parsen |
| Audio abspielen | ✅ | `FileSystemFileHandle.getFile()` → `URL.createObjectURL()` |
| Video abspielen (lokal) | ✅ | Wie Audio (MP4/WebM als Blob URL) |
| YouTube Video Embed | ✅ | YouTube IFrame API (kein Server nötig) |
| Queue verwalten | ✅ | Bereits komplett client-seitig (`useQueue.ts`, BroadcastChannel) |
| Scores speichern | ✅ | Bereits in IndexedDB (`db.ts`, Dexie) |
| Playlists | ✅ | Bereits in IndexedDB (`usePlaylists.ts`, Dexie) |
| TV-Modus (Presentation API) | ✅ | Bereits komplett client-seitig (`useTVMode.ts`) |
| YouTube Download | ❌ | Braucht Server (yt-dlp) |
| USDB Suche | ❌ | Braucht Server (CORS Proxy) |
| Stem Separation | ❌ | Braucht Server (Python/ONNX) |
| AI Lyrics Sync | ❌ | Braucht Server (Whisper) |
| Multi-User (Smartphones) | ❌ | Braucht Server (WebRTC Signaling) |

## Vorgeschlagene Architektur

### Neue Dateien
```
src/games/melodiq/
├── logic/
│   └── localLibraryProvider.ts     # [NEU] — File System Access API Scanner
├── hooks/
│   └── useLocalLibrary.ts          # [NEU] — showDirectoryPicker, Ordner-Handle merken
```

### Bestehende Dateien anpassen
```
src/games/melodiq/
├── hooks/
│   └── useSongs.tsx                # Erweitern: lokale Quelle als Alternative zu Server
├── types.ts                        # Song type erweitern: source: 'server' | 'local'
├── parser.ts                       # Wiederverwenden für UltraStar Parsing
```

## Technische Details

### `localLibraryProvider.ts`

Scannt einen gewählten Ordner rekursiv nach UltraStar `.txt` Dateien und erstellt Song-Objekte.

```ts
interface LocalSong extends Song {
  source: 'local';
  directoryHandle: FileSystemDirectoryHandle;
  txtHandle: FileSystemFileHandle;
  audioHandle: FileSystemFileHandle | null;
  videoHandle: FileSystemFileHandle | null;
  coverHandle: FileSystemFileHandle | null;
}

async function scanLocalDirectory(
  dirHandle: FileSystemDirectoryHandle
): Promise<LocalSong[]> {
  // 1. Rekursiv alle Dateien finden
  // 2. .txt Dateien mit UltraStar-Header identifizieren (parser.ts wiederverwenden)
  // 3. Zugehörige Audio/Video/Cover-Dateien auflösen (#MP3, #VIDEO, #COVER Tags)
  // 4. Song-Objekte erstellen
}
```

### `useLocalLibrary.ts`

```ts
function useLocalLibrary() {
  // showDirectoryPicker() → User-Geste nötig (Button-Klick)
  // Handle in IndexedDB speichern (navigator.storage.getDirectory() oder idb-keyval)
  // Beim nächsten Besuch: handle.requestPermission({ mode: 'read' })
  // Songs scannen und als lokale Quelle bereitstellen
}
```

### File System Access API Besonderheiten
- **Nur Chrome/Edge/Opera** — kein Firefox, kein Safari
- **User-Geste nötig** für `showDirectoryPicker()`
- **Handles persistierbar** in IndexedDB für Wiederverwendung
- **Permission Re-Request**: `handle.requestPermission({ mode: 'read' })` beim nächsten Besuch — zeigt Browser-Prompt
- **Audio aus Dateien**: `handle.getFile()` → `File` → `URL.createObjectURL(file)` → `<audio src=...>`

### `useSongs.tsx` Anpassung

Der bestehende Hook `useSongs.tsx` lädt Songs aktuell via `GET /api/songs` vom Server. Er muss erweitert werden, um auch lokale Songs zu unterstützen:

```ts
// Wenn Server verbunden → Server-Songs laden (wie bisher)
// Wenn kein Server → lokale Songs anzeigen
// Wenn beides → mergen mit Kennzeichnung der Quelle
```

### Song-Typ Erweiterung in `types.ts`

```ts
// Bestehender Song-Typ erweitern
interface Song {
  // ... bestehende Felder ...
  source: 'server' | 'local';  // [NEU]
}
```

### UI-Anpassungen
- **Verbindungs-Screen**: Neben "Server verbinden" auch "Lokalen Ordner öffnen" Option
- **Song-Liste**: Server-only Features (Download, Separation, Delete) ausgrauen/verstecken bei lokalen Songs
- **Settings**: Zeige gewählten Ordner, "Ordner wechseln" Button
- **Browser-Kompatibilität**: Info-Banner für nicht unterstützte Browser (Firefox, Safari)

## Projekt-Regeln (aus AGENTS.md)
- Max 250 Zeilen pro Komponente
- Kein `any` — typisierte FileSystem API Nutzung
- i18n für alle UI-Strings (EN + DE)
- UltraStar Parser aus `parser.ts` wiederverwenden (kein Duplizieren)

## Akzeptanzkriterien

- [ ] User kann über Button einen Ordner auswählen (`showDirectoryPicker`)
- [ ] UltraStar Songs werden rekursiv gescannt und in der Song-Liste angezeigt
- [ ] Ordner-Handle wird in IndexedDB gespeichert und beim nächsten Besuch wiederverwendet
- [ ] Audio-Playback funktioniert ohne Server (Blob URLs)
- [ ] Video-Playback (lokale Dateien) funktioniert ohne Server
- [ ] Queue, Scores, Playlists funktionieren ohne Server
- [ ] Server-only Features (Download, USDB, Separation) sind im Lite-Modus ausgegraut/versteckt
- [ ] Browser-Kompatibilitäts-Hinweis für nicht unterstützte Browser
- [ ] Nahtloser Übergang: wenn User Server verbindet, werden Server-Songs zusätzlich geladen
- [ ] `npm run lint` und `npm run build` fehlerfrei
- [ ] `npm run check:architecture:diff` fehlerfrei

## Labels

`melodiq`, `frontend`, `feature`, `enhancement`
