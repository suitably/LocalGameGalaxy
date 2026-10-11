Update: Evaluated FOSS music streaming platforms with PWA capabilities to replace the bespoke Melodiq backend infrastructure.

[skip docs]

Details:
- Investigated Jellyfin, Navidrome, Funkwhale, and Ampache.
- Concluded that Jellyfin provides the best native combination of PWA capability, robust APIs, and handling of sidecar (USDB .txt) files along with synced backgrounds.
- Created `docs/tech/foss_streaming_evaluation.md` documenting this analysis, outlining architectural integration (Media Backend vs. Client-side PWA), and highlighting long-term benefits such as local pitch detection, offline playability, and shifting focus entirely to frontend mechanics.
- All pre-commit validations passed successfully.
