## 2026-11-22 — Melodiq gameplay sings from ScoreSong vocal parts, #604 (agent)

- `docs/tech/melodiq-architecture.md` §2.11 (new): `songVocals` / `scoreToSungSong` / `useSongVocals`, exact `.txt` round trip, score-only fallback through `scoreToUltraStarGrid`, `noteScoring.ts`, parity tests; score-only songs listed from `?all=1` and loaded by `loadScoreVocals` (`logic/scoreVocals.ts`), `readScoreBytes` moved to `modules/music-score/readScore.ts`.
- `docs/tech/song-pipeline.md` §4: short paragraph linking §2.11; songs without `.txt` are listed in Melodiq too.
- `docs/tech/data-models.md`: UltraStar excerpt uses the module names (`UltraStarNote` / `UltraStarTrack` / `UltraStarSong`), adds `SungSong`; `src/games/melodiq/parser.ts` and `ParsedSong` are removed.
- Outside `docs/`: `scoreToUltraStar.ts` split into `scoreToUltraStarGrid` (structured) + text formatting; `ultraStarToScore` treats a trailing space as a word end.
