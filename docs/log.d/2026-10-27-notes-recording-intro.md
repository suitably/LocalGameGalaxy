## 2026-10-27 — Notes plays a recording's intro instead of skipping it (claude-code)

- `docs/tech/song-pipeline.md` §alignment: the stage starts at the recording's 0:00 when its intro covers the count-in (`introBeat` in `transport.ts`, `StageEngine.firstBeat`); otherwise the click count-in stays.
