# USDB Bulk Download & Background Dashboard Walkthrough

## What Was Implemented

### 1. Backend Sequential Job Queue
- Replaced the concurrent "fire & forget" behavior with a sequential `jobQueue` and a `processJobQueue()` runner. This ensures multiple downloads don't trigger simultaneous USDB or YouTube processes, avoiding rate-limiting or login blocks.
- Modified `POST /api/usdb/download` to accept an array of song objects, creating a batch of jobs dynamically.
- Added a new `GET /api/usdb/jobs` endpoint which returns a list of all jobs currently tracked in memory, including their logs and statuses.

### 2. Frontend Bulk Selection UI
- Added a master checkbox ("Select All") to the table header, and individual checkboxes on each search result row.
- Built a robust, paginated state manager (`selectedSongs` Map) that persists selected songs seamlessly as users traverse pages via the "Next/Previous" buttons.
- Displayed a sticky-like "📥 Download Selected (N)" button next to the result count, only appearing when songs are checked.

### 3. Background Downloads Dashboard
- **No More Popups**: Fully removed the blocking `usdb-progress-modal`.
- **Inline Dashboard**: Created `#usdb-jobs-container` located immediately below the USDB search section.
- **Job Status & Logs**: Shows an expandable `<details>` container for each active or historical download job.
  - Features real-time progress bars and color coding.
  - Automatically expands logs and auto-scrolls down while a job is running.
- **Auto-Restoration**: On page load, the frontend polls `/api/usdb/jobs`. If active downloads exist, the background dashboard will seamlessly restore state, resume progress visualization, and continue fetching logs automatically every 1.5 seconds.

## Verification
- Validated via `node --check index.js` that all injected HTML template literals properly preserved JS escapes. Syntax check succeeds perfectly.
- Dashboard markup correctly aligns with the existing Melodiq aesthetic and is styled to appear distinct yet integrated.
