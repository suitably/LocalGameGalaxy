## 2026-11-22 — Notes: hidden and renamed parts of a score (agent)

- `docs/tech/song-pipeline.md` §4: `song.json` gains `parts` per score file, new `PUT /api/songs/:id/scores/:file/parts`, score deletion drops part settings, and a "Hidden and renamed parts" paragraph (`stageView`, `useStageParts`, `PartSettingsButton`, synth backing via the stage song's `backing`) (#564).
- `docs/tech/melodiq-notes-architecture.md` §pult protocol: the pult part list follows the stage's visible parts; protocol unchanged. `verified.at` 2026-11-22.
