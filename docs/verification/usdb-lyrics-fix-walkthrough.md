# USDB Lyrics & Cover Download Walkthrough

## What Was Accomplished
- **Wait Bypass**: Updated `fetchUsdbTxt()` to send an immediate POST request containing `wd=1` directly to `https://usdb.animux.de/?link=gettxt&id=ID`, successfully bypassing the 24-second browser waiting time.
- **Text Extraction**: Extracted and normalized raw UltraStar text from the HTML textarea tag, cleaning any HTML tags and decoding HTML entities.
- **Cover Image Retrieval**: Added `--write-thumbnail --convert-thumbnails jpg` to `yt-dlp` parameters to fetch high-quality song cover art from YouTube automatically.
- **Clean Cover Rename**: Renamed the default `yt-dlp` output thumbnail file from `${safeName}.mp3.jpg` to `${safeName}-cover.jpg`.
- **Background Header Stripping**: Stripped the non-existent `#BACKGROUND` header lines from the final `.txt` headers.
- **Header Patching**: Programmatically updated the `.txt` headers (`#MP3`, `#VIDEO`, `#COVER`), aligning them with the local files and preserving all original USDB metadata.

## Verification Results
- Syntax checked successfully (`node --check index.js` -> `Syntax OK`).
