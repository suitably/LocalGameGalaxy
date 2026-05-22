# yt-dlp Auto-Installation Fix Plan

## Goal Description
Resolve the `yt-dlp` installation failure inside containerized and modern Linux environments. Currently, running `pip3 install --user` fails due to PEP-668 ("externally managed environment") constraints, or fails entirely if python/pip3 are missing from the container image.

## Proposed Changes

### [MODIFY] [Dockerfile](file:///home/deck/Projects/LocalGameGalaxy/server/Dockerfile)
- Pre-install `python3`, `py3-pip`, `ffmpeg`, and `yt-dlp` via apk/pip3 inside the Docker build process so they are baked directly into the development container.

### [MODIFY] [index.js](file:///home/deck/Projects/LocalGameGalaxy/server/index.js)
- Update `findYtDlpBin()` to check writable paths like `__dirname/yt-dlp`, `process.cwd()/yt-dlp`, and `/tmp/yt-dlp`.
- Update `installYtDlp()` to:
  1. Try `pip3 install --user --break-system-packages --quiet yt-dlp`.
  2. If pip3 fails or is not present, fall back to downloading the standalone `yt-dlp` python zipapp or compiled `yt-dlp_linux` binary from GitHub directly to `/app`, current directory, or `/tmp/yt-dlp`.
  3. Mark downloaded files as executable and verify they run by testing their `--version` flag.

## Verification Plan

### Automated/Syntax Tests
- Run `node --check index.js` -> Syntax OK.
- Run `docker build` (or similar) to verify the new Dockerfile build process works successfully.
