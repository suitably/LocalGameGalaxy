# Fix Video Dual-Path (Embedded YouTube + Local Files)

## Context

MelodiQ soll Videos während des Karaoke-Spiels anzeigen. Es gibt zwei Pfade:
1. **Lokal**: Eine MP4/WebM-Datei im Song-Ordner, referenziert via `#VIDEO:filename.mp4` im UltraStar `.txt` → wird vom Backend über `/media?path=...` gestreamt
2. **Embedded**: Eine YouTube-URL im `.txt` via `#VIDEO:https://youtube.com/...` → wird als YouTube Embed im Frontend angezeigt

### Aktueller Stand (defekt)
- `resolveStreamUrl` in `server/src/services/streaming.js` nutzt `yt-dlp -g` um YouTube-URLs aufzulösen, wird aber in `mediaController.js` **nie aufgerufen** (Dead Code)
- Remote URLs werden in `mediaController.js` per `res.redirect` weitergeleitet — funktioniert nicht für YouTube wegen CORS/Auth
- Video-Playback im Frontend ist nicht implementiert oder defekt

## Aufgabe

### 1. Backend: Media-Streaming aufräumen
- `resolveStreamUrl` (yt-dlp -g) aus `streaming.js` entfernen — YouTube URLs werden nicht mehr Server-seitig aufgelöst
- `mediaController.js`: Remote URL Redirect-Logik entfernen, nur lokale Datei-Auslieferung behalten
- Content-Type korrekt setzen basierend auf Dateiendung (nicht immer `audio/mpeg`):
  - `.mp4` → `video/mp4`
  - `.webm` → `video/webm`
  - `.avi` → `video/x-msvideo`
  - `.mkv` → `video/x-matroska`
  - `.mp3` → `audio/mpeg`
  - `.flac` → `audio/flac`
  - `.ogg` → `audio/ogg`
  - `.m4a` → `audio/mp4`
  - `.wav` → `audio/wav`

### 2. Frontend: YouTube Embed Player
Wenn `#VIDEO` eine YouTube-URL enthält:
- YouTube Video-ID extrahieren (aus `youtube.com/watch?v=XXX`, `youtu.be/XXX`, etc.)
- YouTube IFrame Player API verwenden für programmatische Kontrolle
- Sync mit dem Audio-Playback: Video-Position folgt `audioRef.currentTime`
- Mute das YouTube Video (Audio kommt vom lokalen Audio-Element)

### 3. Frontend: Lokales Video
Wenn `#VIDEO` ein lokaler Dateiname ist:
- Video-URL über `/media?path=...` + Auth Token zusammenbauen
- Standard HTML5 `<video>` Element
- Sync mit Audio-Playback

## Betroffene Dateien

### Backend
- **`server/src/services/streaming.js`**
  - `resolveStreamUrl` → entfernen. Falls die Datei danach leer ist, gesamte Datei löschen.
- **`server/src/controllers/mediaController.js`**
  - **Lines 9–23** (`streamMedia`): Remote URL check (`if (targetPath.startsWith('http'))`) → entfernen, nur lokale Datei-Auslieferung behalten
  - Content-Type basierend auf Dateiendung setzen (aktuell hardcoded oder fehlend)
- **`server/src/services/scanner.js`**
  - **Lines 98, 165**: `headers['VIDEO']` Parsing — prüfen ob korrekt weitergegeben

### Frontend
- **`src/games/melodiq/gameplay/hooks/useMediaLoaders.ts`**
  - **Lines 191–209**: Video URL Resolution — Remote-URL-Unwrapping prüfen/reparieren, YouTube-URL-Erkennung hinzufügen
- **`src/games/melodiq/hooks/useSongs.tsx`**
  - **Lines 64–83**: Video URL Unwrapping — prüfen ob YouTube URLs korrekt durchgereicht werden
- **Neue/reparierte Komponenten** (je nach bestehendem Code):
  - `src/games/melodiq/gameplay/components/VideoPlayer.tsx` oder ähnlich — [NEU oder REPARIEREN]
  - YouTube IFrame API Integration
  - Lokales Video `<video>` Element

### Parser
- **`src/games/melodiq/parser.ts`**
  - **Lines ~1–180**: UltraStar Parser — prüfen ob `#VIDEO:` Tag korrekt extrahiert wird

## Technische Details

### YouTube URL Erkennung
```ts
function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
```

### YouTube IFrame Player API
```ts
// Lade die API einmalig
const tag = document.createElement('script');
tag.src = 'https://www.youtube.com/iframe_api';
document.body.appendChild(tag);

// Player erstellen (muted, da Audio separat läuft)
const player = new YT.Player('video-container', {
  videoId,
  playerVars: { controls: 0, disablekb: 1, modestbranding: 1 },
  events: { onReady: () => player.mute() }
});

// Sync: im requestAnimationFrame Loop
player.seekTo(audioRef.current.currentTime, true);
```

## Projekt-Regeln (aus AGENTS.md)
- Max 250 Zeilen pro Komponente
- Kein `any`
- i18n für neue UI-Strings

## Akzeptanzkriterien

- [x] Lokale Video-Dateien (MP4, WebM) werden während des Spiels korrekt angezeigt
- [x] YouTube-URLs im `#VIDEO`-Tag werden als YouTube Embed Player angezeigt
- [x] YouTube Video ist gemutet (Audio kommt vom lokalen Audio-Element)
- [x] Video-Playback ist mit Audio synchronisiert (Position folgt `audioRef.currentTime`)
- [x] Kein `yt-dlp -g` Stream-Resolve mehr im Backend
- [x] Content-Type Header im `/media` Endpoint korrekt basierend auf Dateiendung
- [x] Video funktioniert sowohl in Host-Ansicht als auch in TV-Modus
- [x] `npm run lint` und `npm run build` fehlerfrei

## Labels

`melodiq`, `frontend`, `backend`, `bugfix`, `feature`
