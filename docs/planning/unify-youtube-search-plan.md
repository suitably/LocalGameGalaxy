# Unify YouTube Search and Resolve URL Plan

## Goal Description
Fix the inconsistency and wrong song matches during YouTube downloads. Currently:
1. Audio downloads search YouTube using: `ytsearch1:${artist} ${title} audio`
2. Stream resolution/video downloads search YouTube using: `ytsearch1:${artist} ${title}`

The additional `"audio"` query token in the audio search query causes incorrect matches (e.g. searching "Die Prinzen Mann im Mond [DUET] audio" matches and downloads "Mein Portemonnaie", while the stream search correctly matches "Mann im Mond"). Furthermore, USDB tags in brackets/parentheses (like `[DUET]`, `(Live)`, `[Karaoke]`) pollute the search query on YouTube, causing the search algorithm to fall back to unrelated popular duet videos (e.g., Roy Black) in certain geolocations or when direct matches are not found.

The goal is to:
1. Unify the searches by resolving the YouTube URL first, using a sanitized search query `ytsearch1:${cleanArtist} ${cleanTitle}` (or using the user-provided `youtubeUrl` if available).
2. Clean up search queries by removing all bracketed `[...]` and parenthesized `(...)` expressions, so that auxiliary tags do not corrupt the search results.
3. Reuse this single resolved URL for both audio download and video download/streaming, ensuring complete consistency.

## Proposed Changes

### server/src/services/download.js
- In `runDownloadJob`, resolve the YouTube URL *before* downloading the audio or video.
- Clean up `artist` and `title` by stripping all `[...]` and `(...)` blocks.
- Retrieve the URL using `yt-dlp --print webpage_url --no-playlist` with the sanitized search query if `youtubeUrl` is not provided.
- Store this in `resolvedUrl`.
- Update step 4 (audio download) to download using `resolvedUrl`.
- Update step 5 (video handling) to download/stream using `resolvedUrl`.

## Verification Plan
1. Trigger a download job for a known song with USDB metadata containing bracketed tags (e.g. Artist: "Die Prinzen", Title: "Mann im Mond [DUET]") in `stream` mode.
2. Verify that the search query logged is cleaned to `"Die Prinzen Mann im Mond"` and correctly resolves to the target video.
3. Verify that both the audio download and the resolved stream URL in the `.txt` point to the same, correct YouTube video ("Mann im Mond" rather than "Mein Portemonnaie" or "Roy Black & Anita").
4. Run the existing tests/linter to ensure no regression.
