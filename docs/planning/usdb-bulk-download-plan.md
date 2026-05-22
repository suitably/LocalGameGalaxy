# USDB Bulk Download & Background Dashboard Implementation Plan

## Goal Description
Enhance the USDB search/download page to allow multi-selection of songs (with pagination persistence), support bulk enqueuing, and replace the popup progress modal with a persistent background downloads dashboard located below the search results. The dashboard must show active/completed jobs and support automatic status restoring upon page refresh.

## Proposed Changes

### [MODIFY] [index.js](file:///home/deck/Projects/LocalGameGalaxy/server/index.js)

#### 1. Backend sequential queue & Job endpoints
- Add a sequential `jobQueue` array and a `processQueue()` runner to download one song at a time.
- Modify `POST /api/usdb/download` to accept an array of song definitions `[{ usdbId, artist, title, videoMode }]` and enqueue them sequentially.
- Add `GET /api/usdb/jobs` which returns the list of all jobs currently in the in-memory `DOWNLOAD_JOBS` map.

#### 2. Frontend Bulk Selection UI
- Add a checkbox column in `thead` (Select All) and `tbody` (Individual rows).
- Implement client-side `selectedSongs` (a Map tracking `usdbId` to `{ artist, title }`) to persist selections across paginated searches.
- Render checkboxes checked/unchecked depending on presence in `selectedSongs`.
- Display a floating or inline action bar containing a "📥 Download Selected (N)" button.

#### 3. Frontend Downloads Dashboard (Replacing Modal)
- Remove `usdb-progress-modal` HTML and JS.
- Add a static panel `#usdb-jobs-container` below the results card.
- In this panel, list each job in a clean list format with progress bars, status labels, and a toggleable log console.
- Poll `/api/usdb/jobs` on page load and every 1.5 seconds if any job is still `pending` or `running`.

## Verification Plan

### Automated/Manual Verification
- Verify syntax: `node --check index.js` -> Syntax OK.
- Run the server, search USDB.
- Check individual boxes, check "Select All", navigate pages and verify selections persist.
- Trigger bulk download of selected songs.
- Verify jobs show up in the dashboard with real-time logs updating in the background without any blocking popup.
- Refresh the page and confirm the active job statuses and logs are restored correctly.
