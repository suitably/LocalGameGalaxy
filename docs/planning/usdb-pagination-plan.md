# USDB Search Pagination Plan

## Goal Description
Implement pagination for the USDB search results. Currently, the USDB search endpoint only fetches the first page of results (up to 30). This plan implements navigation buttons ("Previous" and "Next") in the UI, parsing the total results and total pages from USDB, and transmitting the offset to the USDB search query.

## Proposed Changes

### [MODIFY] [index.js](file:///home/deck/Projects/LocalGameGalaxy/server/index.js)
- Expose the `offset` parameter in the `/api/usdb/search` endpoint and pass it to `searchUsdb()`.
- Pass `offset` via the `start` parameter in the USDB POST query.
- Parse `totalResults` and `totalPages` from the USDB HTML using the regex `/There are\s+(\d+)\s+results on\s+(\d+)\s+page/i`.
- In the frontend client script:
  - Add `usdbOffset` and `usdbTotalResults` variables.
  - Reset offset via `usdbNewSearch()` on fresh searches.
  - Build `changeUsdbPage(dir)` to adjust the offset by the selected limit and query again.
  - Render Prev/Next button controls in the `#usdb-pagination` container and update page labels.

## Verification Plan

### Manual Verification
1. Start the server.
2. Search USDB for "German" (which yields > 3000 results).
3. Verify that the result count shows "3302 result(s) found (showing 1-30)".
4. Click "Next" and verify that it loads results showing 31-60.
5. Click "Previous" and verify that it loads results showing 1-30.
