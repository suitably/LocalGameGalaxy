# USDB Song Downloader – Plan

## Goal Description
Extend the Melodiq Helper server with a **USDB Song Manager** allowing the user to:
1. Search USDB (usdb.animux.de) for songs by title/artist.
2. Download songs (audio via yt-dlp, lyrics `.txt` via USDB login) into a configurable default download folder.
3. Choose per-song video mode: **Download MP4**, **Stream URL**, or **Audio only**.

## Decisions
- **USDB credentials**: Option A – stored in config.json, used for session-based `.txt` download.
- **Video mode**: Selected per song in the search results table.
- **yt-dlp**: Auto-installed via `pip3 install --user yt-dlp` on first download if not found.

## Proposed Changes

### `server/config.js` [MODIFIED]
- Added `downloadDir`, `usdbUsername`, `usdbPassword` to `defaultConfig`.
- Exposed `downloadDir` getter/setter and `setUsdbCredentials(user, pass)` method.

### `server/index.js` [MODIFIED]
- Added `child_process` (`spawn`, `execFileSync`) import.
- Added full USDB backend block before SSL section:
  - `findYtDlpBin()` / `installYtDlp()` / `ensureYtDlp(job)`
  - `spawnYtDlp(bin, args, onLine)`
  - `httpsGetFollow()` / `httpsPost()` HTTP helpers
  - `usdbLogin()` / `searchUsdb()` / `fetchUsdbTxt()` USDB helpers
  - `parseUsdbSearch()` HTML parser (regex-based, no extra deps)
  - `sanitizeFilename()`
  - `runDownloadJob(job)` async pipeline (txt → audio → video → file write → rescan)
  - `DOWNLOAD_JOBS` Map, `USDB_SESSION_COOKIE`
- Added API routes:
  - `GET  /api/usdb/search`
  - `POST /api/usdb/download`
  - `GET  /api/usdb/status/:jobId`
  - `GET/POST /api/config/download-dir`
  - `GET/POST /api/config/usdb-credentials`
- Added USDB Manager UI card to the main HTML page (before `</body>`):
  - Credentials form (username + password)
  - Download folder picker (reuses existing folder browser modal)
  - Search bar with results table
  - Per-song video mode dropdown (MP4 / Stream / Audio only)
  - Download button + progress modal with live log

## Verification Plan
- `node --check index.js` → Syntax OK ✅
- `timeout 5 node index.js` → Server starts on ports 3000/3001 ✅
- Manual: Open Helper UI → USDB Manager section visible
- Manual: Search for a song → results table appears
- Manual: Click Download → progress modal shows log output
- Manual: After download → folder created, files present, library auto-rescanned
