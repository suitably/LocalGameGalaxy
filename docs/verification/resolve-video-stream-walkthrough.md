# Verification Walkthrough: Resolve Video Stream & YT-DLP Errors

## Changes Implemented

### 1. base image upgraded (`server/Dockerfile`)
- Changed base image from `node:18-bookworm-slim` to `node:20-bookworm-slim`.
- Added copying of `deno` binary from `docker.io/denoland/deno:bin` to `/usr/local/bin/deno`. This provides a fully supported default JavaScript runtime for `yt-dlp` to run signature deciphering without warnings.

### 2. stdout/stderr separation (`server/src/services/download.js`)
- Refactored `spawnYtDlp` to buffer stdout and stderr separately.
- Now, only `stdout` is returned as the clean result, preventing any stderr warnings (such as updater checks, deprecated features, or JS runtime advice) from polluting URLs or strings parsed from command outputs.
- Exported `spawnYtDlp` and `ensureYtDlp` so they are accessible from other parts of the application.

### 3. streaming support in scanner (`server/src/services/scanner.js`)
- Updated `getServeUrl` to detect if the path starts with `http://` or `https://` and bypass the local file existence check. This allows web stream URLs inside the `#VIDEO` metadata tag of songs to be loaded as valid video URLs.

### 4. dynamic redirect in media streaming endpoint (`server/src/routes/index.js`)
- Updated the `/media` GET endpoint: if a remote HTTP/HTTPS URL is requested, it calls `yt-dlp -g -f bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best` to resolve the direct playback/streaming URL.
- Once resolved, it responds with an HTTP 302 Redirect to the Google Video direct streaming URL, allowing the frontend HTML5 video player to play the stream directly.

---

## How to Test and Debug

To verify and debug these changes yourself, follow the instructions below.

### 1. Build and Start the Server Container
Run the following command in the `server` directory on your host to rebuild the container and start it:
```bash
podman compose -f docker-compose.dev.yml down
podman compose -f docker-compose.dev.yml build
podman compose -f docker-compose.dev.yml up -d
```

### 2. View Server Logs
To monitor the server logs live while performing actions:
```bash
podman logs -f melodiq-server-dev
```

### 3. Debug the Streaming URL Resolution
You can test the Dynamic Redirect API by calling it directly using `curl`. Replace the token with the token from your server log:
```bash
curl -I "http://localhost:3002/media?path=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ&token=YOUR_SECURITY_TOKEN"
```
It should return:
- `HTTP/1.1 302 Found`
- A `Location` header pointing to a direct `googlevideo.com/videoplayback` URL.

### 4. Manually Run `yt-dlp` Inside the Container to Verify Runtimes
To inspect if `yt-dlp` finds Deno or Node properly without printing warnings:
```bash
podman exec -it melodiq-server-dev /usr/local/bin/yt-dlp -v
```
Verify that:
- It lists `deno` under detected JS runtimes.
- No warnings are printed.
