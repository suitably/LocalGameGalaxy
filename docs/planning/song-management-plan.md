# Song Management and Custom Downloads – Plan

## Goal Description
Extend the Melodiq Helper server and UI to manage downloaded songs and support custom/manual YouTube link downloads. Specifically, the user should be able to:
1. **List & Search Local Songs**: View all downloaded songs in the UI.
2. **Delete Songs**: Delete a local song's directory/files.
3. **Edit TXT Files**: Manually edit the `.txt` lyrics file of any local song directly from the browser UI.
4. **Re-download Songs**: Re-download an existing song (MP3, Video, Cover) using different video modes or custom YouTube links.
5. **Custom YouTube Download**: Manually specify a YouTube link, Artist, Title, and optional USDB ID to download a song from scratch.

## User Review Required
No major architectural shifts or breaking changes are introduced. The library directories configured in `config.json` will continue to be respected. Security validation using `resolveSecurePath` is enforced to prevent directory traversal or accidental deletion outside of library paths.

## Proposed Changes

### `server/src/services/scanner.js` [MODIFY]
- Include `txtPath` (the absolute path of the `.txt` file) in the song metadata object returned by the scanner. This enables the server to know exactly where the song folder and `.txt` files reside on disk.

### `server/src/services/download.js` [MODIFY]
- Update `runDownloadJob(job)` to support:
  - `job.targetDir`: Custom target directory (re-downloads will use the existing folder of the song).
  - `job.safeName`: Custom file naming base (defaults to `${Artist} - ${Title}`).
  - `job.youtubeUrl`: Use the provided YouTube URL directly for yt-dlp instead of querying `ytsearch1:${artist} ${title}`.
  - Local `.txt` recovery: If a `.txt` file already exists at the destination, read and reuse its content rather than downloading it from USDB or generating a minimal one.

### `server/src/routes/index.js` [MODIFY]
- Update `POST /api/usdb/download` to accept custom fields `youtubeUrl`, `targetDir`, and `safeName`.
- Add `DELETE /api/songs/:id` endpoint:
  - Check if the song exists in the cache.
  - Resolve the song folder from `txtPath` using `resolveSecurePath`.
  - Safely delete the directory recursively (or delete individual files if the directory is a root configured directory).
  - Call `scanSongs()` to refresh the cache.
- Add `PUT /api/songs/:id/txt` endpoint:
  - Validate the `txtPath` using `resolveSecurePath`.
  - Overwrite the `.txt` file with the updated content from the body.
  - Call `scanSongs()` to refresh the cache.

### `server/public/index.html` [MODIFY]
- Add a new UI Card: **🎵 Local Songs Library**:
  - Filter/Search input for cached songs.
  - A paginated list/table of songs.
  - For each song, display actions:
    - **Edit TXT**: Opens a modal showing a textarea with the `.txt` content, enabling save and cancel.
    - **Re-download**: Opens a modal where the user can select the Video Mode and optionally input a custom YouTube link.
    - **Delete**: Triggers `DELETE` request with confirmation.
- Add a **➕ Add Custom Song via YouTube** form inside the USDB card or as a standalone section:
  - Inputs: Artist, Title, YouTube URL, Video Mode, and optional USDB ID.
  - Clicking "Download" adds the custom job to the queue.

## Verification Plan

### Automated/Syntax Tests
- Verify syntax and run the server locally to ensure no compilation/runtime errors:
  ```bash
  node --check server/src/routes/index.js
  node --check server/src/services/scanner.js
  node --check server/src/services/download.js
  ```

### Manual Verification
- **Local Song Management**:
  - Verify that the new "Local Songs Library" card displays the list of cached songs.
  - Search for a song; ensure the results are filtered.
  - Click "Edit TXT" on a song, modify some headers/lyrics, save, and verify that the file on disk was modified and the cache rescanned.
  - Click "Delete" on a song, confirm, and verify that the files/directory are deleted from disk and no longer appear in the UI.
  - Click "Re-download" on a song, specify a YouTube link, check the live dashboard logs to confirm yt-dlp downloaded from the specified URL into the correct folder.
- **Custom YouTube Download**:
  - Go to the "Add Custom Song" form.
  - Fill in Artist, Title, a specific YouTube URL, and select Video Mode.
  - Click Download; verify it starts in the dashboard, creates the folder, saves the MP3/Video, and writes a basic `.txt` file.
