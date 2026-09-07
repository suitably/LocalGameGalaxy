# Implementation Plan: Melodiq Server Voice Audio & Lyrics Text Sync [ID: PLAN-MELODIQ-VOICE-TEXT-SYNC]

## Goal Description
Resolve audio-to-lyrics synchronization failures in the Melodiq server:
1. **Container AI Environment & Mount Permissions**: The current dev Docker setup runs on the `base` stage without Python, PyTorch, Whisper, and audio-separator, and mounts music directories as read-only (`:ro`), crashing sync and stem separation. Reconfigure `server/Dockerfile` (include `auditok`) and `server/docker-compose.dev.yml` to target `full`, mount music directories with write permissions (`:z`), and map models permanently.
2. **Robust Voice & Audio Track Selection**: Refactor `server/src/services/separator.js` and `queueManager.js` to automatically discover and prefer separated vocal tracks (`vocalsAudio`, `#VOCALS:`, or files matching `*vocals*`) as requested ("ggf kann die separierte audio only spur verwendet werden"). If a vocal stem is not yet separated, optionally run separation if available, or fall back to the main audio track rather than hard-crashing.
3. **UltraStar Alignment Engine Modernization (`align_lyrics.py`)**:
   - Fix critical UltraStar quarter-beat calculation bug (`BPM * 4` was missing, causing a 400% beat timing skew and broken note lengths).
   - Support German/accented unicode characters in clean word comparison (`re.sub(r'[\W_]+', '', ...)`).
   - Preserve Duet player markers (`P1`, `P2`), rap notes (`R`, `G`), line breaks (`-`), and encoding fallback (UTF-8, CP1252, Latin-1).
   - Configure Whisper model cache directory (`/app/models`) to avoid re-downloading models on each run.
4. **Interactive Debug Container**: Rebuild and start the `melodiq-server-dev` container with live port bindings (`3000`, `3001`) and interactive debugging verification.

## Reused Components & Modules
- `src/games/melodiq/api/melodiqFetch.ts`: Reused for communicating with Melodiq server API endpoints (`/api/separator/job`, `/api/separator/status/:id`).
- `src/games/melodiq/components/SongActionDialogs.tsx`: Enhanced to provide both Start Auto-Sync (`auto-sync`) and Full AI Lyrics Alignment (`full-sync`).
- `src/components/common/ConfirmDialog.tsx`: Used for user confirmation of full AI alignment instead of forbidden native `window.confirm()`.
- `server/src/services/scanner.js`: Utilizes existing scanned audio tracks (`vocalsAudio`, `audio`, `originalAudio`).

## Proposed Changes

### 1. `server/Dockerfile`
- Add `auditok` to the `full` target pip packages alongside `audio-separator[cpu]` and `whisper-timestamped`.
- Set `ENV TORCH_HOME=/app/models WHISPER_CACHE_DIR=/app/models`.

### 2. `server/docker-compose.dev.yml`
- Switch target to `full`.
- Change music mounts from `:ro` to `:z` (writable SELinux-compatible mount for `/home/deck/Music/Ultrastar/Songs` and `Test`).
- Mount `./src:/app/src:z` and `./index.js:/app/index.js:z` for seamless local live-code iteration.

### 3. `server/src/scripts/align_lyrics.py`
- Fix beat-to-time and time-to-beat formulas using `bpm * 4.0`.
- Preserve headers, `P1`/`P2` duet sections, and note types (`:`, `*`, `F`, `R`, `G`, `-`, `E`).
- Support UTF-8 and CP1252/Latin-1 encodings.
- Retain unicode word cleaning for German umlauts and international lyrics.
- Cache Whisper model in `/app/models`.

### 4. `server/src/services/separator.js` & `server/src/services/queueManager.js`
- Pass `vocalsFile` from `song.vocalsAudio` into the job queue.
- Support robust vocals stem discovery (case-insensitive, `.mp3`, `.m4a`, `.wav`, `.ogg`, `.flac`, and `#VOCALS:` header).
- In `runAutoSyncJob` and `runFullSyncJob`:
  - Prefer separated vocal stem if present.
  - If vocal stem not present, attempt separation if installed, or fallback gracefully to master audio.
  - Handle manual pause/time sync without requiring separation.

### 5. `src/games/melodiq/components/SongActionDialogs.tsx` & `src/games/melodiq/i18n/index.ts`
- Add UI action for "Full KI-Sync (Komplette Lyrics)" alongside "Auto-Sync (Nur Start)".
- Add internationalization strings for English and German.

## Verification Plan
1. **Lint & Build**: Run `npm run lint` and `npm run build` in root workspace.
2. **Container Build & Startup**: Build and start the container using `distrobox-host-exec podman compose -f server/docker-compose.dev.yml up -d --build`.
3. **Endpoint & Health Check**: Verify `curl http://localhost:3000/api/status` returns authenticated status and library scan.
4. **AI Sync Validation**:
   - Test `python3 /app/src/scripts/align_lyrics.py` inside the container or trigger `/api/separator/job` with a test song.
   - Verify that the updated `.txt` file preserves `#GAP:`, duet structure, and proper beat timestamps.
