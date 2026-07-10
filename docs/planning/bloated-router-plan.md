# Plan - Refactoring Bloated Express Router [ID: PLAN-BLOATED-ROUTER]

Refactor the bloated Express router in `server/src/routes/index.js` to adhere to the Single Responsibility Principle (SRP). We will delegate route handling, template parsing/rendering, yt-dlp execution, queue management, and configuration persistence to dedicated controllers and services.

## Goals

1. **Adhere to SOLID (SRP)**: Ensure `routes/index.js` is only responsible for mapping URL endpoints to controllers.
2. **Modular Controller Layer**: Move route logic to specific controllers (`viewController`, `mediaController`, `songController`, `configController`, `jobController`).
3. **Dedicated Streaming Service**: Move yt-dlp CLI stream url resolution logic into a `streaming` service.
4. **Queue Manager Service**: Encapsulate download and vocal separation job creation and queue execution behind a unified `queueManager` service.
5. **Ensure Backwards Compatibility & Stability**: Do not modify existing API behavior, parameters, or payloads. All endpoints and dynamic html generation must behave exactly as before.

## Proposed Component/File Split

```
server/src/
├── controllers/            # New controllers directory
│   ├── viewController.js   # HTML template views (login.html, index.html)
│   ├── mediaController.js  # Streaming endpoint and direct stream redirects
│   ├── songController.js   # Song crud, metadata updates, upload, status, scan
│   ├── configController.js # Directories, download dir, preferences, credentials, api-keys, github, feedback
│   └── jobController.js    # USDB downloader and Audio Separator job status and queues
├── services/
│   ├── streaming.js        # New dedicated service for resolving stream URLs
│   └── queueManager.js     # New service wrapper around DOWNLOAD_JOBS and SEPARATOR_JOBS
└── routes/
    └── index.js            # Simplified Express router referencing controllers
```

## Proposed Changes

### 1. `server/src/services/streaming.js`
Expose `resolveStreamUrl(targetPath)` which interacts with `spawnYtDlp` and `ensureYtDlp` from the download service to resolve and validate raw streaming URLs.

### 2. `server/src/services/queueManager.js`
Centralize array and map modifications for download/separator jobs. Expose:
- `addDownloadJobs(requests)`
- `getDownloadJobsList()`
- `getDownloadJobStatus(jobId)`
- `checkSeparatorInstalled()`
- `installSeparator()`
- `getSeparatorJobsList()`
- `getSeparatorJobStatus(jobId)`
- `addSeparatorJobs(requests)`

### 3. `server/src/controllers/viewController.js`
Handles template parsing and rendering for `login.html` and `index.html` including placeholder replacements.

### 4. `server/src/controllers/mediaController.js`
Handles the `/media` route. Calls `streaming.resolveStreamUrl` for remote URLs and serves local media files via secure path validation.

### 5. `server/src/controllers/songController.js`
Handles songs endpoints:
- `getSongs`
- `getSongById`
- `deleteSong`
- `updateSongTxt`
- `uploadSongVideo` (using existing `multer` middleware)
- `getScanStatus`
- `refreshLibrary`

### 6. `server/src/controllers/configController.js`
Handles configuration/preferences endpoints:
- `getDirectories` / `addDirectory` / `removeDirectory`
- `browseDirectory`
- `getDownloadDir` / `setDownloadDir`
- `getPreferences` / `setPreferences`
- `getUsdbCredentials` / `setUsdbCredentials`
- `getApiKeys` / `createApiKey` / `updateApiKey` / `deleteApiKey`
- `getGithubConfig` / `setGithubConfig`
- `submitFeedback` (GitHub issue creation)

### 7. `server/src/controllers/jobController.js`
Handles job trigger and status endpoints by delegating to `queueManager`.

### 8. `server/src/routes/index.js`
Simplify routes mapping. Import controllers and wire endpoints directly to controller methods.

## Verification Plan

### Automated Verification
1. Run `npm run lint` from the root workspace and address any warnings/errors introduced by our changes.
2. Run `npm run build` from the root workspace to verify compilation is successful.

### Manual Verification
1. Boot the backend server: `cd server && npm start`.
2. Access `http://localhost:3000` or `https://localhost:3001` to verify route rendering (login, home).
3. Test a few API endpoints via curl/browser to ensure they respond with correct status and payloads:
   - `/api/songs`
   - `/api/config/directories`
   - `/api/status`
