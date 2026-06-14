# Resolve Video Stream Planning Document

## Goal Description
Resolve two major video-related issues in the Melodiq system:
1. Fix the `yt-dlp` warning regarding a missing JavaScript runtime by updating the base Node.js image in the container.
2. Prevent `yt-dlp` stderr warnings from polluting stdout parsing.
3. Support "stream-only" mode for YouTube videos by resolving YouTube URLs in the metadata and dynamically redirecting `/media` requests for web URLs to their direct stream URLs using `yt-dlp`.

## Proposed Changes

### 1. server/Dockerfile
- Upgrade the base image from `node:18-bookworm-slim` to `node:20-bookworm-slim` to provide `yt-dlp` with a supported external JavaScript runtime (EJS), removing the warning entirely.

### 2. server/src/services/download.js
- Modify `spawnYtDlp` to separate `stdout` and `stderr` accumulation. Only return `stdout` as the resolved value on success, preventing any stderr warnings or messages from polluting resolved URLs or other strings.
- Export `spawnYtDlp` and `ensureYtDlp` from `download.js` so they can be consumed by the routes layer.

### 3. server/src/services/scanner.js
- Update `getServeUrl` helper to return the string directly if the value starts with `http://` or `https://`, permitting remote video URLs in the `#VIDEO` metadata of songs.

### 4. server/src/routes/index.js
- Update the `/media` endpoint: if the requested path starts with `http://` or `https://`, import `yt-dlp` services, resolve the URL to a direct streaming URL via `yt-dlp -g`, and return a 302 redirect.

## Verification Plan
1. Rebuild the container and verify that `yt-dlp` runs without EJS warnings.
2. Verify that local songs can have YouTube stream URLs in their `#VIDEO` header.
3. Verify that `/media?path=[youtube-url]` successfully redirects to the direct google video stream.
