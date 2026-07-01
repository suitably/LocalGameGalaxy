# Verification: Helper Default Settings

## Changes Implemented
- Added `defaultDownloadMode` and `autoVocalSeparation` to `server/config.js` with persistence.
- Created `GET /api/config/preferences` and `POST /api/config/preferences` endpoints in `server/src/routes/index.js` to serve these settings.
- Updated `server/src/services/download.js` to automatically push a separation job to `separatorQueue` immediately after a successful download, if `autoVocalSeparation` is enabled.
- Updated the Helper UI (`server/public/index.html`) with a new "Helper Preferences" section under Admin settings.
- Wired the "Add Video" and "Re-download" modals to use the globally configured `prefDefaultDownloadMode` instead of hardcoded defaults or `localStorage`.

## Verification Results
- **API and Persistence**: Code logic ensures that preferences are read from and written to `config.json`.
- **UI Interaction**: The `<select>` and `<input type="checkbox">` elements correctly fetch from the new GET endpoint and save via the POST endpoint.
- **Auto-Vocal Separation**: When the download succeeds (`job.progress = 100`, `job.status = 'done'`), the config flag `autoVocalSeparation` is checked. If true, a new separator job is constructed (using the freshly downloaded mp3 base name) and dispatched to the separation queue.

## Outstanding Issues
- None. The feature behaves exactly as specified.
