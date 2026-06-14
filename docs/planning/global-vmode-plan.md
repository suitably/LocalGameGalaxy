# Implementation Plan - Global Default Video Mode Selector [ID: GLOBAL-VMODE-PLAN]

## Goal Description
Improve the UX of the USDB Song Manager within Melodiq Helper. Currently, users must change the video format (Audio, MP4, Stream) individually for each song when using the bulk downloader or downloading single songs from search results. 

This plan introduces:
1. A **global video mode dropdown** located directly in the table header (`🎬 Video` column) of the USDB search results.
2. **Persistence** of the chosen video mode preference in the browser's `localStorage` so that it persists across page reloads.
3. **Synchronized updates**: changing the global selector instantly updates all individual dropdowns on the current page, updates the format for any already-selected songs, and synchronizes the "manual download" video mode form.

## Proposed Changes

### Frontend: `server/public/index.html`
- **Table Header**: Replace `🎬 Video` with a `<select id="global-vmode">` element.
- **Initialization**: On page load, read the default video mode from `localStorage` (defaulting to `none` for Audio) and set both the manual download select (`manual-vmode`) and the global select (`global-vmode`) values.
- **Row Rendering**: Update `renderUsdbResults` to set each row's `vmode-${i}` select element value based on the current selection in `global-vmode`.
- **Global Change Handler**: Implement `changeGlobalVideoMode(val)` to:
  1. Save `val` to `localStorage` under `usdb_default_vmode`.
  2. Sync the manual download form selector `manual-vmode` value.
  3. Loop through current search result dropdowns and set them to `val`.
  4. Loop through the `selectedSongs` Map and update the `videoMode` value for all currently checked songs.

## Verification Plan

### Manual UI Verification
1. **Initial State Check**:
   - Open Melodiq Helper in the browser.
   - Verify the default format is "Audio" for both manual download and the search results table header.
2. **Search and Bulk Update**:
   - Perform a search.
   - Change the global selector in the table header to `🎬 MP4`.
   - Verify that all individual row dropdowns in the search results automatically change to `🎬 MP4`.
   - Verify that the manual download select format changes to `🎬 MP4`.
   - Select a few songs and verify they show `Download Selected (N)` and can be queued successfully with the correct video mode.
3. **Persistence Test**:
   - Refresh the page.
   - Verify that the table header global selector and manual download selector load with the persisted preference (e.g. `🎬 MP4` or `📡 Stream`).
   - Run a new search and verify that newly rendered rows default to the persisted choice.
4. **Override Test**:
   - Change the global selector to `📡 Stream`.
   - Change one specific row to `🎵 Audio`.
   - Download the single song or bulk download it and check the dashboard/payload to confirm the overridden song was sent as `none` (Audio) while others are sent as `stream` (Stream).
