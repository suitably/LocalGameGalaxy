# Server Refactoring Plan

Refactor the monolithic `/server/index.js` (currently 2134 lines) into a modular, clean, maintainable structure following separation of concerns, without changing any existing features or API behaviors.

## Proposed Structure

We will split the responsibilities of the monolith into:
- **Presentation**: `server/public/login.html` and `server/public/index.html`
- **Middlewares**: `server/src/middleware/auth.js`
- **Utilities**: `server/src/utils/helpers.js` and `server/src/utils/http.js`
- **Services**: 
  - `server/src/services/ssl.js` (SSL Certificate generation)
  - `server/src/services/scanner.js` (Song scanning logic and memory cache)
  - `server/src/services/usdb.js` (USDB scraping, parsing, login)
  - `server/src/services/download.js` (yt-dlp runner and download job queue)
- **Routes**: `server/src/routes/index.js` (Express endpoints)
- **Entry point**: `server/index.js` (Loads configuration, configures Express, boots servers)

## User Review Required

> [!IMPORTANT]
> The server uses `pkg` to package itself into a binary. By splitting the codebase, we must make sure all new source files and template assets (HTML) are correctly declared in `package.json` under `pkg.assets` and loaded via `path.join(__dirname, ...)` in the code.

## Proposed Changes

### [server]

#### [NEW] [login.html](file:///home/deck/Projects/LocalGameGalaxy/server/public/login.html)
Move the raw HTML for the Melodiq login page to a separate file.

#### [NEW] [index.html](file:///home/deck/Projects/LocalGameGalaxy/server/public/index.html)
Move the raw HTML for the Melodiq main page (with placeholders for dynamic variables like `{{AUTH_TOKEN}}`, `{{SONG_COUNT}}`, `{{DIRECTORIES}}`, `{{NETWORK_URL}}`, `{{LOCAL_IP}}`, `{{PORT}}`, `{{SCAN_DISABLED}}`, `{{SCAN_TEXT}}`) to a separate file.

#### [NEW] [helpers.js](file:///home/deck/Projects/LocalGameGalaxy/server/src/utils/helpers.js)
Contains functions `getLocalIp`, `sanitizeFilename`, and `generateId`.

#### [NEW] [http.js](file:///home/deck/Projects/LocalGameGalaxy/server/src/utils/http.js)
Contains gzip-aware HTTP helpers: `decompressResponse`, `httpsGetFollow`, and `httpsPost`.

#### [NEW] [ssl.js](file:///home/deck/Projects/LocalGameGalaxy/server/src/services/ssl.js)
Contains self-signed RSA certificate generation logic using `node-forge`.

#### [NEW] [scanner.js](file:///home/deck/Projects/LocalGameGalaxy/server/src/services/scanner.js)
Manages the song cache (`SONG_CACHE`, `IS_SCANNING`) and executes library scans (`scanSongs`).

#### [NEW] [usdb.js](file:///home/deck/Projects/LocalGameGalaxy/server/src/services/usdb.js)
USDB login session management (`USDB_SESSION_COOKIE`), search scraping (`searchUsdb`, `parseUsdbSearch`), and lyric txt download (`fetchUsdbTxt`).

#### [NEW] [download.js](file:///home/deck/Projects/LocalGameGalaxy/server/src/services/download.js)
Downloader job management (`DOWNLOAD_JOBS`, `jobQueue`), yt-dlp binary finding/installing/spawning, and job runner queue process.

#### [NEW] [auth.js](file:///home/deck/Projects/LocalGameGalaxy/server/src/middleware/auth.js)
Middlewares: Auth verification (`requireAuth`), Rate limiting, custom CORS allowed origin setup.

#### [NEW] [index.js](file:///home/deck/Projects/LocalGameGalaxy/server/src/routes/index.js)
Consolidates routing for song listings, media streaming, directory browsing, configurations, and USDB actions.

#### [MODIFY] [index.js](file:///home/deck/Projects/LocalGameGalaxy/server/index.js)
Simplify to clean server startup code.

#### [MODIFY] [package.json](file:///home/deck/Projects/LocalGameGalaxy/server/package.json)
Update `pkg.assets` array configuration.

## Verification Plan

### Automated Tests
- Boot the server locally: `npm start` in the `server` directory and check console output for correct setup (SSL loading, server listening, initial scan running).
- Verify endpoints return correct JSON payload.

### Manual Verification
- Access `http://localhost:3000` or `https://localhost:3001` via browser.
- Verify redirect to login card when unauthorized, and successfully access the main card.
- Perform a song scan and a search on USDB to ensure downloader jobs and queue process as expected.
