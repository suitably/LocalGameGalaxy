# Unify YouTube Search Tasks

- [x] Resolve YouTube URL before downloading audio/video in `runDownloadJob` in `server/src/services/download.js` <!-- id: 0 -->
- [x] Update audio download step in `runDownloadJob` to use the resolved URL <!-- id: 1 -->
- [x] Update video download / streaming step in `runDownloadJob` to use the resolved URL <!-- id: 2 -->
- [x] Strip bracketed and parenthesized suffixes (e.g. `[DUET]`, `(Live)`) from YouTube search queries <!-- id: 5 -->
- [x] Verify functionality with a real test download <!-- id: 3 -->
- [x] Run linter to ensure code style is correct <!-- id: 4 -->
