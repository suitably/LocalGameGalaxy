# USDB Bulk Download & Background Dashboard Tasks

- [x] Add `jobQueue` and `processQueue()` in the backend for sequential downloads.
- [x] Implement `GET /api/usdb/jobs` to retrieve all tracked jobs.
- [x] Modify `POST /api/usdb/download` to support processing an array of song requests.
- [x] Add bulk selection UI (checkboxes, select-all) to the USDB search results table.
- [x] Implement the `selectedSongs` Map client-side to persist selections across pagination.
- [x] Replace `usdb-progress-modal` HTML with a static `#usdb-jobs-container` below the search card.
- [x] Implement background polling logic for `/api/usdb/jobs` and dynamic job row rendering.
- [x] Ensure syntax checks pass and changes work correctly.
