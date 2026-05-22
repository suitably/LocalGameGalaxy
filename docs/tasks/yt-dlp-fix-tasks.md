# yt-dlp Auto-Installation Tasks

- [x] Update Dockerfile to include python3, py3-pip, ffmpeg, and yt-dlp.
- [x] Update `findYtDlpBin()` to check local and temp paths.
- [x] Add `--break-system-packages` flag to `pip3` installer.
- [x] Implement fallback HTTP download of `yt-dlp` zipapp and compiled linux binaries.
- [x] Automatically make downloads executable and run a test execution checklist.
