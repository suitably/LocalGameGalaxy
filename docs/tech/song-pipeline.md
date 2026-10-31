---
type: Reference
title: 'Song ingestion, vocal separation and lyric alignment pipeline'
description: "How the companion server's melodiq plugin downloads songs (USDB .txt + yt-dlp audio/cover/video), separates stems (audio-separator, UVR-MDX-NET ONNX model), aligns lyrics (whisper-timestamped), and which job-based HTTP endpoints the client polls."
tags: [melodiq, server, usdb, yt-dlp, audio-separator, whisper, pipeline]
status: stable
generated:
  at: 2026-10-18T15:00:00+02:00
  by: claude-code
verified:
  at: 2026-10-31
  method: 'read server/src/plugins/melodiq/{services/download.ts,services/queueManager.ts,services/separator.ts,services/usdb.ts,services/scanner.ts,services/songFolder.ts,services/notesMigration.ts,routes/*.ts}, server/src/scripts/align_lyrics.py'
sources:
  - 'server/src/plugins/melodiq/services/download.ts'
  - 'server/src/plugins/melodiq/services/separator.ts'
  - 'server/src/scripts/align_lyrics.py'
---

# Song pipeline (companion server, `melodiq` plugin)

Runs only when the companion server is used. Everything is **job-based**: the client starts a job, then polls its status. There is no SSE stream.

## 1. Download job (`services/download.ts`)

yt-dlp lookup, install and spawning live in `services/ytdlp.ts`; `.txt` header parsing and rewriting in `services/ultrastarTxt.ts`.

Started by `POST /api/usdb/download`; poll `GET /api/usdb/status/:jobId`; list `GET /api/usdb/jobs`; cancel/clear `DELETE /api/usdb/jobs/:jobId?`.

1. **Target folder** — `downloadDir`, else the first configured directory, else cwd; one sub-folder per song (sanitised name). A request with `songId` downloads into that indexed song's folder instead (`queueManager.resolveDownloadRequest`; folder must lie in a library directory, unknown ids queue nothing → `400`); such a job keeps the folder's existing `#VIDEO` when `videoMode` is `none`. A song without `.txt` (§4) is downloaded into its folder under the folder's name; the job writes a `.txt`, so the song turns into a karaoke song and keeps its `song.json` id.
2. **Lyrics** — reuse an existing local `.txt` with notes, else log in to USDB (`usdb.animux.de`, credentials via `POST /api/config/usdb-credentials`) and fetch `?link=gettxt&id=<usdbId>`. Without credentials/ID a minimal `.txt` is generated.
3. **YouTube URL** — taken from the request or resolved by search (`GET /api/youtube/search`).
4. **Cover, audio, video** — via `yt-dlp`. Video either downloaded (`bestvideo[ext=mp4]+bestaudio[ext=m4a]/…`) or, in `stream` mode (`defaultDownloadMode`, default `stream`), only the stream URL is written to the `.txt` header.
5. **Write `.txt`** with media headers, index the song (the job's `songId`, returned by `GET /api/usdb/status/:jobId`, is set before `status` becomes `done`), rescan, and — if `autoVocalSeparation` is enabled in config — queue a separation job.

`yt-dlp` resolution: looks in `PATH` and several fixed locations; if missing it tries `pip3 install --user yt-dlp`, then downloads the **latest** release binary from GitHub. **Inference:** this is an unpinned runtime download — relevant for security reviews and offline hosts. `ffmpeg` must be installed separately.

## 2. Separation and alignment jobs (`services/separator.ts`)

| Endpoint                                                                                            | Purpose                                                                                                                                                |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/separator/status`                                                                         | whether Python deps are installed                                                                                                                      |
| `POST /api/separator/install`                                                                       | installs CPU-only PyTorch, then `audio-separator[cpu]` and `whisper-timestamped` via `pip3` (adds `--break-system-packages` on system-managed Pythons) |
| `POST /api/separator/job`                                                                           | start a separation or alignment job (`SeparatorJobRequest`)                                                                                            |
| `GET /api/separator/jobs`, `GET /api/separator/status/:jobId`, `DELETE /api/separator/jobs/:jobId?` | list / poll / cancel                                                                                                                                   |

- **Separation:** `audio-separator` with model `UVR-MDX-NET-Inst_HQ_3.onnx` from `MODELS_DIR` (default `<cwd>/models`). Output stems are `.mp3` files whose names contain `Vocals` / `Instrumental`; the scanner picks them up next to the `.txt`.
- **Alignment ("Full AI Sync"):** `python3 server/src/scripts/align_lyrics.py <txt> <audio>` — Whisper `base` model on CPU (`whisper-timestamped`, models in `WHISPER_MODELS_DIR` / `TORCH_HOME` / `/app/models`), uses the vocals stem if present, else the master audio, and rewrites note timings in the `.txt`.
- The Docker `full` image pre-installs the Python stack; the `base` image does not (see [deployment](deployment.md)).

ADR-0004 still describes Demucs; see [open-questions Q13](../open-questions.md#q13--adr-0004-no-longer-matches-the-separation-stack).

## 3. Library and media endpoints

| Endpoint                               | Purpose                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `GET /api/songs`, `GET /api/songs/:id` | scanned library: karaoke songs (UltraStar `*.txt`); `?all=1` adds songs without `.txt` (§4) |
| `POST /api/songs/refresh`              | rescan                                                                                      |
| `PUT /api/songs/:id/txt`               | overwrite the `.txt`                                                                        |
| `POST /api/songs/:id/video`            | set / download a video                                                                      |
| `DELETE /api/songs/:id`                | delete (needs master token or API key with `allowSongDeletion`)                             |
| `GET /media?path=…`                    | file streaming with HTTP 206 range support                                                  |
| `GET /api/browse`                      | directory browser for the config UI                                                         |
| `GET/POST/DELETE /api/playlists…`      | server playlists (`playlists.json`)                                                         |

Auth for all of these: [server-security.md](server-security.md). Client side: `src/games/melodiq/api/` and the settings UI under `src/features/settings/components/server/`.

## 4. Sheet music for Melodiq Notes

Since #568 (reversing Q18) the **song folder is the only store** for Melodiq and Melodiq Notes: the karaoke `.txt` with its mix, sheet music (`.mxl`, `.musicxml`, `.mid`/`.midi`, Guitar Pro 7/8 `.gp`, and `.xml` when it is MusicXML — sniffed for `<score-partwise>`/`<score-timewise>`, `server/src/utils/scoreFiles.ts`) with `<score>.marks.json` bar marks, Notes' own recordings as extra audio, and `song.json`. One model, not one file format: a `.txt` is never converted to MusicXML on disk or back.

**Scanner** (`services/scanner.ts`, helpers in `services/songFolder.ts`). A folder is a song if it has a valid karaoke `.txt` **or** sheet music / `song.json` (`readSongFolder`); loose files in a library root are not a song. Each song carries `folder`, `karaoke`, `folderScores`, `recordings` (audio besides the mix and its stems) and `labels`.

- **Id rule:** a valid `id` in the folder's `song.json` is the song's id, with or without `.txt` (it survives renaming the folder and a `.txt` being added later; with several `.txt` files only the first by name takes it). A folder without a `song.json` id keeps the id derived from the `.txt` (title, artist, path), so existing Melodiq ids do not change; a scan never writes `song.json` into a folder that has a `.txt`.
- With `.txt`: one song per `.txt`.
- Without `.txt` (`readScoreOnlySong`): title, artist and the id come from `song.json`. A folder without `song.json` gets one written on the first scan (title and artist from an "Artist - Title" folder name); a copied folder with a duplicate `song.json` id gets a new one (`dedupeSongIds`). These songs are listed only with `GET /api/songs?all=1` (Melodiq Notes), not in Melodiq's karaoke list.

**Export as UltraStar `.txt` (#567).** With bar marks (aligned, or from a karaoke load), the stage's recording panel offers "Save as UltraStar .txt" (`UltraStarExport.tsx`, `buildUltraStarFile` in `stage/logic/ultraStarExport.ts`); a vocal-part picker appears when the song has several vocal parts, plus a duet entry for exactly two. `scoreToUltraStar` in `modules/music-score/scoreToUltraStar.ts` is the inverse of `ultraStarToScore`: score beat -> seconds (bar marks, plus the fine-tune offset) -> UltraStar beat on a grid of 15 / `#BPM` seconds. Default `#BPM` is the marks' average quarter tempo, doubled until it is at least 240 (grid of at most 62.5 ms); `#GAP` is the first note's time. Pitch 60 = 0; a syllable gets a leading space when it starts a new word (not the track's first), no space when the previous one ends in '-', and '~' when it has no lyric. Kinds come from `ScoreNote.ultrastar` (`*`/`F`/`R`/`G`), else every note is `:` (MusicXML has no kinds: lossy). Line breaks come from `ScorePart.phraseBreaks` when present, else from the pauses between notes (0.7 s, 0.28 s after a note ending in `.`, `!` or `?`). Two parts become `P1`/`P2` with `#DUETSINGERP1/P2`. Without bar marks it throws. Writing the file into the song folder is not built (#568). The MusicXML export with marks (`applyBarMarksToMusicXml`) stays next to it.

**`song.json`** (replaces the Notes `piece.json`): `{ version: 1, id, title, artist, labels: { <score file>: <label> } }`. With a `.txt`, its headers win for title and artist. `PUT /api/songs/:id/meta` on a song without `song.json` writes the song's current id into it, so that id stays fixed from then on.

| Endpoint (`routes/songFiles.ts`)        | Behaviour                                                                                                                                                                                                                                                                   |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/songs`                       | new song folder without `.txt` (`{ title, artist? }`) in `downloadDir` (when inside a library) or the first library directory; writes `song.json`                                                                                                                           |
| `PUT /api/songs/:id/meta`               | `song.json`: `title`, `artist`, `labels` (merged; an empty label removes it; only existing score files)                                                                                                                                                                     |
| `POST /api/songs/:id/files`             | upload a score or a recording (multipart `file`); never overwrites (`name (2)`)                                                                                                                                                                                             |
| `DELETE /api/songs/:id/files/:file`     | remove a score (with its marks and label) or an extra recording; the mix and its stems are not addressable; needs `allowSongDeletion`                                                                                                                                       |
| `GET /api/songs/:id/archive`            | the whole song folder (sub-folders included, hidden files and symlinks left out) as an uncompressed, streamed ZIP with `Content-Length` (`utils/zipStream.ts`, `services/songArchive.ts`); `?token=` works for a plain link; a library root answers `400`, over 4 GiB `413` |
| `GET /api/songs/:id/scores/:file/marks` | the score's bar marks                                                                                                                                                                                                                                                       |
| `PUT /api/songs/:id/scores/:file/marks` | store bar marks (`{ marks, offsetSec?, audio? }`) next to the score                                                                                                                                                                                                         |

Clients get each song's `scores` (`{ file, url, hasMarks, label }`) and `recordings` (`{ file, url }`) with `/media` URLs in `GET /api/songs`. `DELETE /api/songs/:id` removes a song without `.txt` with its folder. Marks whose `audio` names none of the folder's recordings belong to the song's mix (the app saves them with `audio: null`). `/api/notes/pieces…`, `/notes/media/…` and the earlier `/api/songs/:id/scores` upload/delete routes are gone (no aliases).

**Migration of the old Notes library** (`services/notesMigration.ts`, counterpart of the removed Q18 import). After the initial scan, every piece folder in `NOTES_DIR` moves into a song folder: a piece with `songId` into that song's folder, any other piece (or one whose song is gone) into a new song folder without `.txt` with `song.json`. Scores, their `.marks.json` and recordings are copied; name clashes go through `uniqueFileName`, a file the song folder already holds with the same content (from the Q18 import) is not copied twice, marks follow a renamed recording, and of two marks files for the same score the newer wins. The marker `.song-folders-migrated.json` in `NOTES_DIR` lists each migrated piece and, once a run had no failures, `completedAt`, after which startup skips the migration. It is non-destructive: the originals stay until confirmed.

| Endpoint                            | Behaviour                                                              |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `GET /api/notes/migration`          | `{ pending, migrated, completedAt, confirmedAt }`                      |
| `POST /api/notes/migration/run`     | migrate pieces not migrated yet, without a restart (management rights) |
| `POST /api/notes/migration/confirm` | remove the migrated originals from `NOTES_DIR` (management rights)     |

**Karaoke vocals (#566).** A song with an UltraStar `.txt` (`txtContent`) offers "Vocals (karaoke)" in its Notes entry: its singer tracks as vocal parts (`loadKaraokeVocals` in `stage/serverScoreLoad.ts`, `ultraStarToScore` in `modules/music-score`) with the song's mix. The `.txt` is timed to that mix, so the bar marks come from `#BPM` and `#GAP` and no alignment runs; they are not stored. Saving with the vocals on stage only uploads a new recording into the song folder.

The server does not search or download sheet music: users fetch MusicXML or Guitar Pro files themselves (for example from musescore.com or Songsterr with their own account; the library links both searches, `scoreSearchUrl` and `songsterrSearchUrl` in `src/lib/companion/songScoresApi.ts`). Alignment runs in the client (`src/modules/music-score`), the server only stores the result.

Melodiq Notes lists one entry per song folder (`buildScoreCatalog` in `src/games/melodiq-notes/stage/logic/scoreCatalog.ts`, from `listLibrarySongs` in `src/lib/companion/songScoresApi.ts`): its scores (shown by label, else file name), its recordings (mix plus Notes recordings) and its karaoke vocals. All scores of a song play with the same mix (`pickRecording` in `stage/serverScoreLoad.ts`). Songs with a `.txt` show a "Melodiq song" badge; only songs without `.txt` can be deleted from Notes. Every entry has "Manage files" (`stage/components/SongFilesDialog.tsx`, state in `stage/useSongFilesManager.ts`, rules in `stage/logic/songFileEdits.ts`): a score is renamed through its `song.json` label (the file, its bar marks and links stay; an empty label or one equal to the file name shows the file name), title and artist are editable only for songs without `.txt` (`PUT /api/songs/:id/meta` with only the changed fields), scores and extra recordings can be added (`POST /api/songs/:id/files`), downloaded one by one or as the whole folder in a ZIP (`songArchiveUrl` → `GET /api/songs/:id/archive`), and deleted (`DELETE /api/songs/:id/files/:file`, which needs `allowSongDeletion`; the server's error is shown). The mix and its stems are not listed. Unsaved name changes ask before the dialog closes. The picker's search (`searchCatalog` in `stage/logic/catalogSearch.ts`) matches every query word in artist, title, genre, language, a score's label or file name, or the translated instrument and format names; facets are format (by extension: MusicXML, MIDI, Guitar Pro, karaoke `.txt`), instrument, language and genre (the last two from the `.txt` header), and they narrow a song down to the matching scores. A score's instrument is only guessed from its label or file name (`scoreInstruments`, rules of `instrumentsInName` in `src/modules/music-score/instruments.ts`, song title and artist left out); the server does not report a score's parts, so a score named e.g. "Full Transcription" has no instrument. Karaoke vocals always count as vocals. Saving (`saveToNotesLibrary` in `stage/logic/notesLibrarySync.ts`, client `src/lib/companion/notesLibraryApi.ts`) writes into the song the score came from; a score not on the server yet goes into the song folder with the same normalised artist + title, else into a new song folder (`POST /api/songs`).

**Recording from YouTube (#486).** "Find on YouTube" in the Melodiq Notes recording panel (stage → Recording; `stage/components/YouTubeRecordingDialog.tsx`, `stage/useYouTubeImport.ts`, logic in `stage/logic/youtubeImport.ts`) starts from the score on stage: it uses the song the score came from, else a song folder with the same normalised artist + title. A song **with** a recording is used as it is (its mix is never replaced); one without a recording, or no match, gets a §1 download job (`POST /api/usdb/download` with `youtubeUrl`, `videoMode: 'none'`, and `songId` for the existing folder), searched via `GET /api/youtube/search` (client: `src/lib/companion/songDownloadApi.ts`). After the job is done the score is in that song folder — it already was when it came from there, else it is uploaded (`POST /api/songs/:id/files`) — and it is opened with the song's mix and aligned right away.

`alignRecording` (`src/modules/music-score/alignment.ts`) produces one mark per bar in two stages: a coarse match, then `fitMarksToNotes` (whole-song Viterbi fit of the score's attacks to band and pitch-class onsets, ±0.6 s per bar). The coarse match depends on the score:

- **Pitched parts present:** tuning estimate, semitone-shift search and a chroma + onset DTW (`warpScoreToAudio`, `marksFromWarp`). The DTW may leave up to 30 s of score unmatched at either end (an arrangement's intro or outro the recording lacks); a skipped frame costs 1.1 × the song's mean cost of unrelated frame pairs (`unrelatedCost`), and skipped bars continue the tempo of the matched path, so bars before the recording get negative times (`fitMarksToNotes` leaves those unclamped). The stage starts at the first bar with a mark at or after 0 s (`firstRecordedBeat`, `StageRecording.startBeat`): earlier bars get no notes, no band and no count-in. When the recording has sound before that bar (its intro) for at least the count-in, the stage starts at the recording's 0:00 instead (`introBeat` in `transport.ts`, `StageEngine.firstBeat`) and plays the intro without clicks; otherwise the click count-in stays and the recording joins in once its 0:00 is reached. The timeline cannot seek before `firstBeat`. The shift search does not skip.
- **Drums only** (`hasPitchedNotes` is false, `onsetAlign.ts`): there is no pitch to follow, so `estimateTempoAndStart` cross-correlates (FFT) the score's kick/snare/cymbal attacks with the recording's band onsets (`onsetFeatures`) for tempo ratios 0.7–1.4, and `marksFromOnsets` places every bar start jointly by a Viterbi on a 20 ms grid (each bar at most 10 % off the global tempo, at a cost; free start). Bars without attacks, such as an intro without drums, follow the tempo around them. `tuning.semitones` is 0.

## 5. Song folder layout

No fixed file names — whatever the `.txt` headers reference. A song without `.txt` has only `song.json`, scores, marks and recordings:

```
<library dir>/<Artist - Title>/
├── <name>.txt                 # UltraStar lyrics + #MP3/#VIDEO/#COVER headers
├── <audio>.mp3|m4a|…          # master audio
├── <… Vocals …>.mp3           # stem (optional)
├── <… Instrumental …>.mp3     # stem (optional)
├── <video>.mp4                # optional (or stream URL in the .txt)
├── <cover>.jpg|png            # optional
├── <score>.mxl|musicxml|mid|gp # sheet music for Melodiq Notes (any number)
├── <score>.marks.json         # bar marks aligning that score with a recording
├── <take>.webm|mp3|…          # Notes recordings (extra audio besides the mix)
└── song.json                  # title, artist, score labels; the id of a song without .txt
```
