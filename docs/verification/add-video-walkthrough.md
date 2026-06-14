# Add Video Feature Walkthrough

This document summarizes the changes made to introduce the "Add Video" feature to the Local Songs Library in the Melodiq Helper.

## Changes Implemented

1.  **Dependencies**: Added `multer` to `package.json` and ran `npm install` to support robust `multipart/form-data` uploads.
2.  **Backend Integration**:
    -   Added a new `POST /api/songs/:id/video` endpoint in `server/src/routes/index.js`.
    -   Configured a `multer` disk storage strategy to dynamically resolve the song's secure directory and generate a safe filename for the uploaded `.mp4` file.
    -   Added logic to automatically modify the song's underlying `.txt` file by inserting a `#VIDEO:` tag directly after the `#MP3:` or `#TITLE:` tags, and triggering a library cache rescan.
3.  **Frontend Interface**:
    -   Added a new `🎬 Add Video` button next to each song in the local library view.
    -   Created an `addVideoModal` featuring a tabbed interface for both **YouTube URL** (stream/download) and **Upload MP4** options.
    -   Reused the existing robust `POST /api/usdb/download` request payload format for the YouTube integration, ensuring it seamlessly plugs into the backend's `yt-dlp` job queue.
    -   Implemented a `FormData` upload flow to pass selected MP4 files to the new `multer` endpoint.

## Outstanding Issues

-   **Verification Required**: Please restart your Melodiq Helper node server and manually test the flow:
    - Click "Add Video" on any song.
    - Test providing a YouTube URL and verifying it is queued.
    - Test selecting an MP4 and verifying it successfully uploads and modifies the `.txt` file.
