# USDB Lyrics & Cover Download Fix Plan

## Goal Description
Resolve the issue where downloaded `.txt` files from USDB do not contain actual lyrics/notes, cover images, or song details.

## Cause of Failure
1. **Waiting Redirect Page**: USDB's download link (`?link=gettxt&id=ID`) returns a "Please wait 24 seconds" HTML page when accessed via a normal GET request. The actual lyrics file is only delivered after posting `wd=1` via a POST request.
2. **Missing Cover Art**: The downloader did not download the song's cover art, leaving the `#COVER` header empty or broken.
3. **Invalid BACKGROUND & COVER filename formats**: The default downloaded cover filename format from `yt-dlp` was `[Artist] - [Title].mp3.jpg` which is ugly, and non-existent `#BACKGROUND` header references were kept.

## Proposed Changes

### [MODIFY] [index.js](file:///home/deck/Projects/LocalGameGalaxy/server/index.js)
- Update `fetchUsdbTxt()` to send an immediate POST request to USDB with body `wd=1` to bypass the delay.
- Extract the clean UltraStar text from the `<textarea>` wrapper in the response, stripping any HTML tags and decoding HTML entities.
- Update `yt-dlp` arguments to download the high-quality YouTube video thumbnail (`--write-thumbnail --convert-thumbnails jpg`).
- **Clean Naming & Stripping**: Rename the downloaded thumbnail from `.mp3.jpg` to `-cover.jpg` (e.g. `[Artist] - [Title]-cover.jpg`) and strip nonexistent `#BACKGROUND` lines from the written `.txt` headers.
- Dynamic Header Patching: Update `#COVER`, `#MP3`, and `#VIDEO` headers in the final `.txt` file, referencing the local files.

## Verification Plan
- Run `node --check index.js` -> Syntax OK.
