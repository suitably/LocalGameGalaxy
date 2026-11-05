## 2026-11-05 — Melodiq Notes alignment passes and new preferences documented (claude-code)

- `docs/tech/song-pipeline.md` §4: the DTW leaves out sections only one side has (affine gaps, `warp.ts`, `warpSegments`); `fitMarksToNotes` repeats its ±0.6 s fit (up to 4 passes) while a mark ends at the window edge; §1 step 4: Melodiq Notes plays recordings without exact seeking (MP3) from a decoded WAV.
- `docs/tech/persistence.md`: Melodiq Notes keys completed (`_SEEK_LEAD_IN`, `_MIDI_SOUND`) plus the new `_LAST_SONG` and `_INSTRUMENT` (#635); `docs/tech/game-catalog.md` key count 4 → 8.
