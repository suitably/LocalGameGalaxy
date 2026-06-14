# Verification Walkthrough - Global Default Video Mode Selector [ID: GLOBAL-VMODE-WALKTHROUGH]

This document verifies the implementation of the global default video mode selector in the USDB Song Manager of Melodiq Helper.

## Changes Implemented

### Frontend Updates (`server/public/index.html`)
- Added a `<select id="global-vmode">` element in the table header replacing the static text `🎬 Video`.
- Implemented `changeGlobalVideoMode(val)` to:
  - Persist preferred default video mode in `localStorage` under `usdb_default_vmode`.
  - Automatically update the manual download video mode selector (`manual-vmode`).
  - Update all individual row selector dropdowns in the search results table.
  - Dynamically update the video mode of any songs already selected in `selectedSongs`.
- Initialized default video mode values for `global-vmode` and `manual-vmode` on page load from `localStorage` (defaulting to `none` for Audio).
- Updated `renderUsdbResults` to initialize individual row selectors with the stored preference.

## Verification Checklist & Results

### 1. Initial State & Page Load
- **Test**: Load page.
- **Expected**: Default mode should be "Audio" (`none`) for both manual download and the global selector in the results table header (if no preference has been saved yet).

### 2. Live Synchronization on Dropdown Change
- **Test**: Perform a USDB search and change the global header dropdown to `🎬 MP4`.
- **Expected**:
  - The manual download selector format instantly updates to `🎬 MP4`.
  - All row selectors (`vmode-${i}`) update to `🎬 MP4`.
  - Selecting songs now schedules them in the correct format.

### 3. Preference Persistence
- **Test**: Set the global selector to `📡 Stream` and reload the page.
- **Expected**:
  - Both manual download and global selector load as `📡 Stream`.
  - Running a new search shows all newly rendered row dropdowns automatically set to `📡 Stream`.

### 4. Row Override Integrity
- **Test**: Set global default to `📡 Stream` but manually toggle one song row dropdown to `🎵 Audio`.
- **Expected**:
  - Changing the single song dropdown does not affect the global dropdown or other rows.
  - Adding this song to the download queue correctly schedules it as `none` (Audio), while others are scheduled as `stream` (Stream).
