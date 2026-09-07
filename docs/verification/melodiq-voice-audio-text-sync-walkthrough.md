# Walkthrough: Melodiq Server Voice Audio & Lyrics Text Sync [ID: WALKTHROUGH-MELODIQ-VOICE-TEXT-SYNC]

## Overview
This walkthrough documents the successful refactoring of the Melodiq server and container stack to support high-accuracy voice audio and lyrics text synchronization, prioritizing separated vocal stems (`#VOCALS:`, `vocalsAudio`) with fallback to master audio. The container has been built, deployed, and tested live.

## Changes Implemented

### 1. Dockerfile & Container Architecture (`server/Dockerfile` & `server/docker-compose.dev.yml`)
- **AI Stack stage (`target: full`)**: Configured PyTorch CPU, `audio-separator[cpu]`, `whisper-timestamped`, and added `auditok` for Voice Activity Detection (VAD).
- **Persistent Model Cache**: Configured `TORCH_HOME=/app/models` and `WHISPER_CACHE_DIR=/app/models` mapped to a persistent volume mount (`./models:/app/models:z`) so models are downloaded only once.
- **SELinux & Writable Mounts**: Updated host music mounts (`/home/deck/Music/Ultrastar/Songs` and `Test`) to writable `:z` flags, avoiding `EROFS` errors when updating `#GAP:` and writing stems.
- **Hot-Reload Source Mount**: Mounted `./src:/app/src:z` and `./index.js:/app/index.js:z` for instant script and route updates without rebuilding the ~3.5GB image.

### 2. Alignment Script Fixes (`server/src/scripts/align_lyrics.py`)
- **Quarter-Beat Formula Correction**: Fixed critical 4x timing discrepancy by correctly applying the UltraStar standard `BPM * 4.0` in `beat_to_time` and `time_to_beat`.
- **Preserved Metadata & Duets**: Preserved duet markers (`P1`, `P2`, `P3`), note types (`:`, `*`, `F`, `R`, `G`), line breaks (`-`), and non-note headers.
- **Robust Character Clean & Encoding**: Added multi-encoding support (`utf-8-sig`, `utf-8`, `cp1252`, `latin-1`) and regex clean matching that preserves German umlauts (`ä, ö, ü, ß`).
- **Offset Interpolation Fix**: Resolved `KeyError: 'offset'` during unmapped word interpolation.

### 3. Server Job & Stem Priority (`server/src/services/separator.js` & `queueManager.js`)
- **Vocals Stem Priority**: Added `findVocalsFile()` helper searching explicit parameters, `#VOCALS:` headers, and directory stems (`vocals.mp3`, `vocals.ogg`, `vocals.wav`, `vocals.flac`, `vocals.m4a`).
- **Auto-Sync (Gap/Start Detection)**: Prioritizes vocal audio for silence detection to find exact singing start timestamps.
- **Full-Sync (Whisper Forced Alignment)**: Uses separated vocals track if available, separates using `audio-separator` if needed, and gracefully falls back to master audio if separation is unavailable.

### 4. Client UI & i18n Integration
- **`SongActionDialogs.tsx`**: Added "KI Full-Sync (Komplette Lyrics)" action using `<ConfirmDialog>` with warnings about CPU duration (~30-60s).
- **Localization**: Added German and English localization keys for all new actions and descriptions in `src/games/melodiq/i18n/index.ts`.

---

## Verification Results

### 1. Root & Server Quality Gates
- **Server Unit Tests**:
  ```
  npm test (in server/)
  ✔ 10 passed, 0 failed, duration: 5.2s
  ```
- **Linter**:
  ```
  npx eslint src/games/melodiq/components/SongActionDialogs.tsx src/games/melodiq/i18n/index.ts
  0 errors, 0 warnings
  ```
- **Root Build**:
  ```
  npm run build
  ✓ built in 40.56s (clean TypeScript compilation & Vite bundle)
  ```

### 2. Live Container Verification
- **Container Status**: `nexumia-server-dev` running on ports 3000 (HTTP) and 3001 (HTTPS).
- **Library Scan**: Scanned 8,197 songs successfully from host directories.
- **Separator Tool Detection**:
  ```bash
  curl -s -H "Authorization: Bearer 55f7a1128452020e3e5a3c5abe019bdf" "http://localhost:3000/api/separator/status"
  # Returns: {"installed": true}
  ```

### 3. End-to-End Test: Auto-Sync (Start & GAP Detection)
- Triggered on song `ABBA - Waterloo`:
  ```json
  {
    "status": "done",
    "progress": 100,
    "log": [
      "Auto-Syncing Waterloo...",
      "Using separated vocals track for start detection: vocals.ogg",
      "Running silence detection on vocals.ogg...",
      "Detected vocals start at: 6613 ms",
      "BPM: 339.3, First Note Beat: 0",
      "Old GAP: 6675.51 ms -> New GAP: 6613 ms",
      "Successfully updated song GAP to 6613 ms!"
    ]
  }
  ```

### 4. End-to-End Test: Full-Sync (Whisper Syllable Alignment)
- Triggered on song `ABBA - Waterloo`:
  ```json
  {
    "status": "done",
    "progress": 100,
    "log": [
      "Full AI Syncing Waterloo...",
      "Found separated vocals track: vocals.ogg. Using for AI alignment.",
      "Running AI Forced Alignment with Whisper on: vocals.ogg...",
      "[Aligner] Parsing /music/songs/ABBA - Waterloo/ABBA - Waterloo.txt...",
      "[Aligner] Found 214 words in UltraStar TXT.",
      "[Aligner] Loading Whisper model (base) [Cache: /app/models]...",
      "[Aligner] Language: en (from 'english')",
      "[Aligner] Transcribing audio with Whisper (VAD: auditok)...",
      "[Aligner] Whisper transcribed 186 words.",
      "[Aligner] Successfully matched 31 equal text blocks.",
      "[Aligner] Writing updated UltraStar TXT to /music/songs/ABBA - Waterloo/ABBA - Waterloo.txt...",
      "[Aligner] Lyrics alignment completed successfully!",
      "Successfully aligned lyrics!"
    ]
  }
  ```
- **Verified TXT Output**:
  `#GAP:0` with every note aligned to absolute time quarter-beats (`: 150 6 69 My,`, `: 156 6 69  my`, etc.) and preservation of `#VOCALS:` and `#INSTRUMENTAL:` headers.

### 5. Download Queue, USDB Lyrics Validation & UI Vocal Separation Guard
- **Stuck 100% Download Bar Fix**: In `OnlineSongsView.tsx`, added `status !== 'done'` check when identifying `activeJob`. This prevents completed jobs from lingering on deleted songs as `isDownloading: true` with 100% progress.
- **Immediate Cache Eviction**: In `songController.js`, `deleteSong` now immediately updates `SONG_CACHE` so deleted songs do not persist for 2 minutes in memory.
- **Queue Cleanup API**: Added `DELETE /api/usdb/jobs/:jobId?` and `DELETE /api/separator/jobs/:jobId?` to allow purging completed or stuck jobs.
- **USDB Lyrics Validation**: In `download.js`, updated logic to verify whether local `.txt` files actually contain note lines (`/^[:*FRG]\s/m`). If no notes exist (or `usdbId` is specified), lyrics are freshly downloaded from USDB.
- **Empty Syllables Whisper Fallback**: In `align_lyrics.py`, added transcription-to-note generation when the `.txt` file contains no syllables, generating valid UltraStar note lines from Whisper speech recognition.
- **Frontend Vocal Separation Guard**: In `SongActionDialogs.tsx`:
  - Added direct action button: "Gesangsspur trennen (UVR AI)".
  - Guarded "Auto-Sync" and "KI Full-Sync": disabled when vocal separation is not yet completed (`!hasVocals`), or when separation/sync is currently running (`isSeparating`, `isSyncing`), with clear informative status labels.

