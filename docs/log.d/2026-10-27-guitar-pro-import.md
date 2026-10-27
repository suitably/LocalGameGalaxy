## 2026-10-27 — Guitar Pro 7/8 import in Melodiq Notes (claude-code)

- `docs/tech/architecture.md` §3.2 (`music-score` row): `parseGuitarPro` / `extractGpif`.
- `docs/tech/song-pipeline.md`: `.gp` as a song-folder score format (§1 store, folder layout, sheet-music note).
- Outside `docs/`: `src/modules/music-score/guitarPro.ts` (+ test), `writeOutNotes` / `BarEvent` exported from `musicXml.ts`, `stage/loadScore.ts`, `SongPicker.tsx` accept list, locales `open_file`, server `SCORE_EXTENSIONS`, `.gp` MIME type and upload error text.
