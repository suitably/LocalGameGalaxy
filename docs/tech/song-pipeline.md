# Song Ingestion & Vocal Separation Pipeline [ID: TECH-SONG-PIPELINE]

> [!NOTE]
> This pipeline runs entirely on the companion server (`/server`) as a series of sequential subprocesses. It is CPU-intensive; see the operational guide for hardware recommendations.

---

## 1. Pipeline Overview

```
User Input (URL / USDB Search)
        │
        ▼
┌─────────────────┐
│  1. USDB Search │  ── Scrape USDB for song metadata + lyrics (.txt)
│  (usdb.js)      │
└────────┬────────┘
         │ if YouTube URL provided
         ▼
┌─────────────────┐
│  2. Download    │  ── yt-dlp downloads audio as MP3/M4A
│  (yt-dlp)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. Separation  │  ── audio-separator (Demucs) splits vocals / instrumental
│  (separator.js) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. Alignment   │  ── Python align_lyrics.py syncs lyric timestamps to audio
│  (align_lyrics) │
└────────┬────────┘
         │
         ▼
   Song marked 'ready' in MelodiqDB
   Files available via /api/songs/:id/stream
```

---

## 2. Stage Details

### Stage 1: USDB Metadata Scraping (`usdb.js`)
- Queries the USDB website using a custom HTML scraper (`scrapeUSDB()`).
- Parses the search results HTML to extract song ID, title, artist, and lyrics URL.
- Downloads the UltraStar `.txt` lyric file and saves it to the song directory.

### Stage 2: Audio Download (`yt-dlp`)
- Accepts a YouTube URL or auto-searches YouTube by title+artist.
- Spawns `yt-dlp` as a child process with `--audio-format mp3 --audio-quality 0`.
- Output is saved as `audio.mp3` in the song directory.
- Status is tracked and streamed to the client via Server-Sent Events (SSE).

### Stage 3: Vocal Separation (`separator.js`)
- Spawns a Python subprocess running `audio-separator` with the Demucs `htdemucs` model.
- Input: `audio.mp3`. Outputs: `vocals.mp3` and `instrumental.mp3`.
- Progress is logged and forwarded to the client via SSE.
- The Python environment must be pre-configured (see [onboarding-faq.md](file:///home/deck/Projects/LocalGameGalaxy/docs/tech/onboarding-faq.md)).

### Stage 4: Forced Alignment (`align_lyrics.py`)
- Optional step that refines per-syllable timestamps in the UltraStar `.txt` file.
- Uses `auditok` for audio activity detection and `difflib` for lyric-to-audio matching.
- Updates the `.txt` file in-place with corrected BPM note timings.

---

## 3. File Layout (per song)

```
<configured_music_directory>/
└── <song-uuid>/
    ├── audio.mp3          # Full mixed audio (from yt-dlp)
    ├── vocals.mp3         # Separated vocal stem (from Demucs)
    ├── instrumental.mp3   # Separated instrumental stem (from Demucs)
    └── lyrics.txt         # UltraStar format lyrics file (from USDB + alignment)
```

---

## 4. API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/songs` | POST | Add song to queue (triggers download pipeline) |
| `GET /api/songs` | GET | List all songs with processing status |
| `GET /api/songs/:id/stream` | GET | Stream audio file (vocals or instrumental) |
| `POST /api/separate/:id` | POST | Trigger re-separation for an existing song |
| `GET /api/progress` | GET (SSE) | Server-Sent Events stream for pipeline progress |
