# USDB Lyrics & Cover Download Tasks

- [x] Refactor `fetchUsdbTxt()` to POST with `wd=1`.
- [x] Extract lyrics from `<textarea>` and decode HTML entities using `stripHtml()`.
- [x] Update audio downloader in `yt-dlp` to write and convert video thumbnails to `.jpg`.
- [x] Rename the downloaded cover file to `${safeName}-cover.jpg` instead of `.mp3.jpg`.
- [x] Strip non-existent `#BACKGROUND` header lines from the final `.txt` headers.
- [x] Patch written `.txt` files to include the correct `#COVER`, `#MP3`, and `#VIDEO` headers.
- [x] Verify syntax check succeeds.
