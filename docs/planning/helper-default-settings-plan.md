# Helper Default Settings

This feature adds the ability for admins to configure default settings for the Melodiq Helper UI. Specifically, defining the default download mode (stream, mp4, audio) and enabling automatic vocal separation after downloads.

## User Review Required

Please review the proposed architectural changes below.

## Proposed Changes

### Backend Configuration (`server/config.js`)
- Add `defaultDownloadMode` (default: 'stream') to `defaultConfig`.
- Add `autoVocalSeparation` (default: false) to `defaultConfig`.
- Add getters and setters for both fields, persisting to `config.json`.

### Backend Routes (`server/src/routes/index.js`)
- Add `GET /api/config/preferences` to retrieve `defaultDownloadMode` and `autoVocalSeparation`.
- Add `POST /api/config/preferences` to update these settings.
- Ensure the POST endpoint is protected by checking API Key permissions if necessary.

### Auto-Vocal Separation Logic (`server/src/services/download.js`)
- Import `crypto` and `separator.js` queues.
- At the end of `runDownloadJob`, if `config.autoVocalSeparation` is true and the job succeeded, automatically create a separator job using the newly downloaded `songDir`, `audioFile`, and `txtFile`, then call `processSeparatorQueue()`.

### Frontend Helper UI (`server/public/index.html`)
- Add a new "Settings" section visible only to Admins.
- Include a `<select>` for Default Download Mode and a `<input type="checkbox">` for Auto Vocal Separation.
- Fetch these preferences on page load and populate the UI.
- Use the fetched `defaultDownloadMode` as the default selected option in all download modals (Manual Download, Add Video, Re-download, and Global Search Downloads) instead of hardcoding `'mp4'` or `localStorage`.

## Verification Plan

### Manual Verification
- Access the Helper UI as an admin and update the Default Download Mode and Auto Vocal Separation switch.
- Verify the API saves and returns the new config.
- Try searching and opening the "Re-download" or "Add Video" modals to see if they default to the new setting.
- Trigger a download and verify that a Vocal Separation job is automatically started after completion (if enabled).
