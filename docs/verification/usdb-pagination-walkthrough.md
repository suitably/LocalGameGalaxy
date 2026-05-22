# USDB Search Pagination Walkthrough

## Goal
Enable pagination (Prev/Next navigation) for USDB search results by parsing total results/pages, transmitting the offset parameter to the backend/USDB, and rendering pagination controls in the web interface.

## Changes Implemented

### [MODIFY] [index.js](file:///home/deck/Projects/LocalGameGalaxy/server/index.js)
- Implemented offset tracking on the client side (`usdbOffset`).
- Added `#usdb-pagination` container inside the results wrapper.
- Implemented `usdbNewSearch()`, `changeUsdbPage(dir)`, and updated `renderUsdbResults()` to dynamically render pagination page state and toggle Prev/Next button disabled states.
- Handled escaping of template strings inside the server-side layout template to avoid parsing conflicts.
- Updated the backend `/api/usdb/search` endpoint to receive the `offset` parameter and pass it to `searchUsdb()`.
- Updated `searchUsdb()` to map `offset` to the USDB `start` post body parameter.
- Updated HTML parsing strategy in `parseUsdbSearch` to extract total results and total pages from USDB response page info text.

## Verification Results
- Syntax check passed successfully (`node --check index.js` -> `Syntax OK`).
- Server successfully boots up on port 3000.
