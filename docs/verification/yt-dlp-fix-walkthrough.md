# yt-dlp Auto-Installation Walkthrough

## What Was Accomplished
- **Dockerfile Update**: Baked `python3`, `py3-pip`, `ffmpeg`, and `yt-dlp` directly into the Node-Alpine docker image, eliminating the need to install dependencies at runtime in the container.
- **Modern Pip Bypass**: Added the `--break-system-packages` flag to `pip3` installation command, ensuring compatibility with modern PEP-668 Python installations on the host.
- **Standalone Download Fallback**: Added a self-healing downloader that fetches `yt-dlp` or `yt-dlp_linux` from GitHub releases using `curl`/`wget` to writable directories (`/tmp`, `/app`, etc.) and tests them for validity before use if system-wide package installation fails.

## Verification Results
- Syntax check passed successfully (`node --check index.js` -> `Syntax OK`).
