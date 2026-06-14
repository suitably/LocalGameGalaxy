# Add Video to Local Songs

This plan describes how to add an "Add Video" feature to the Local Songs Library, allowing users to attach a video to an existing song either via a YouTube URL (downloaded or streamed) or by uploading a local MP4 file. We will reuse the existing `USDB Song Manager` and `Re-download` functionality where possible.

## Approach
- **Upload Method**: We will use `multer` for standard `multipart/form-data` uploads of local MP4 files.

## Proposed Changes

### Frontend Component
#### server/public/index.html
- **Local Songs Table**: Add an `Add Video` button for songs.
- **Add Video Modal**: Create a new modal with two options:
  1. **YouTube URL**: Input for a YouTube link, with a select box for `Video Mode` (MP4 Download or Stream). This will reuse the existing `POST /api/usdb/download` endpoint logic (similar to `triggerReDownload`), which natively handles updating the `.txt` file and downloading the video.
  2. **Upload MP4**: A file input (`<input type="file" accept=".mp4,video/mp4">`) to upload a local video file.
- **Upload Logic**: Add JavaScript to handle the MP4 file selection via FormData and POST to `api/songs/:id/video`.

### Backend Component
#### server/src/routes/index.js
- **Dependencies**: Install and import `multer`.
- **New Endpoint**: Implement `POST /api/songs/:id/video` using `multer.single('video')`.
  - Validate the song exists and has a `.txt` file.
  - Save the uploaded MP4 file to the song directory.
  - Upon successful upload, update the song's `.txt` file:
    - Remove any existing `#VIDEO:` line.
    - Insert `#VIDEO:safeName.mp4` near the `#MP3:` tag.
  - Call `scanSongs()` to refresh the cache.
