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
  at: 2026-10-25
  method: 'read server/src/plugins/melodiq/{services/download.ts,services/queueManager.ts,services/separator.ts,services/usdb.ts,services/scoreMigration.ts,routes/*.ts}, server/src/scripts/align_lyrics.py'
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

1. **Target folder** — `downloadDir`, else the first configured directory, else cwd; one sub-folder per song (sanitised name). A request with `songId` downloads into that indexed song's folder instead (`queueManager.resolveDownloadRequest`; folder must lie in a library directory, unknown ids queue nothing → `400`); such a job keeps the folder's existing `#VIDEO` when `videoMode` is `none`.
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

| Endpoint                               | Purpose                                                              |
| -------------------------------------- | -------------------------------------------------------------------- |
| `GET /api/songs`, `GET /api/songs/:id` | scanned library (UltraStar `*.txt` under the configured directories) |
| `POST /api/songs/refresh`              | rescan                                                               |
| `PUT /api/songs/:id/txt`               | overwrite the `.txt`                                                 |
| `POST /api/songs/:id/video`            | set / download a video                                               |
| `DELETE /api/songs/:id`                | delete (needs master token or API key with `allowSongDeletion`)      |
| `GET /media?path=…`                    | file streaming with HTTP 206 range support                           |
| `GET /api/browse`                      | directory browser for the config UI                                  |
| `GET/POST/DELETE /api/playlists…`      | server playlists (`playlists.json`)                                  |

Auth for all of these: [server-security.md](server-security.md). Client side: `src/games/melodiq/api/` and the settings UI under `src/features/settings/components/server/`.

## 4. Sheet music for Melodiq Notes

Since Q18 the **Notes library** (plugin `notes`, `NOTES_DIR`, `server/src/plugins/notes/services/library.ts`) is the only store for sheet music and bar marks. A Notes piece may carry `songId` (in its `piece.json`): it then belongs to that Melodiq song and plays with the song folder's mix instead of a copy, while its scores and `<score>.marks.json` stay in the piece folder. Marks whose `audio` names none of the piece's own recordings belong to the song's mix (the app saves them with `audio: null`).

**One-time import.** After the initial scan the melodiq plugin imports every score found in a song folder (`.mxl`, `.musicxml`, `.mid`/`.midi`, and `.xml` when it is MusicXML — sniffed for `<score-partwise>`/`<score-timewise>`; scanner field `Song.folderScores`, `server/src/utils/scoreFiles.ts`) into a Notes piece linked to that song, together with its `.marks.json` (`services/scoreMigration.ts`). Originals stay in the song folder. The marker file `.song-scores-imported.json` in the notes folder lists every imported source file, so a restart never imports one twice — not even after its piece was deleted; a score added to a song folder later is imported on the next start.

| Endpoint (deprecated, `routes/scores.ts`) | Behaviour                                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `GET /api/songs/:id/scores`               | scores of the Notes pieces linked to the song: `{ pieceId, file, url, hasMarks }` (`/notes/media`) |
| `GET /api/songs/:id/scores/:file/marks`   | alias of the linked piece's marks                                                                  |
| `PUT /api/songs/:id/scores/:file/marks`   | alias: stores the marks in the linked piece (never in the song folder)                             |
| `POST /api/songs/:id/scores`              | `410` with `use`: create a piece with `songId` and upload into it                                  |
| `DELETE /api/songs/:id/scores/:file`      | `410` with `use`: delete the file from its Notes piece                                             |

`GET /api/songs` and `/api/songs/:id` fill each song's `scores` the same way. Clients use the Notes routes (`/api/notes/pieces…`, `POST`/`PUT` accept `songId`; on `PUT` a missing `songId` keeps the link, `null` removes it).

The server does not search or download sheet music: users fetch MusicXML themselves (for example from musescore.com with their own account). Alignment runs in the client (`src/modules/music-score`), the server only stores the result.

Melodiq Notes lists only Notes pieces (`src/games/melodiq-notes/stage/logic/scoreCatalog.ts`, one entry per piece, no title matching); a linked piece shows a "Melodiq song" badge and loads with the song's mix (`pickRecording` in `stage/serverScoreLoad.ts`). Saving always goes to the Notes library (`saveToNotesLibrary` in `stage/logic/notesLibrarySync.ts`).

**Recording from YouTube (#486).** "Find on YouTube" in the Melodiq Notes recording bar (`stage/components/YouTubeRecordingDialog.tsx`, `stage/useYouTubeImport.ts`, logic in `stage/logic/youtubeImport.ts`) starts from the score on stage: it uses the song the piece is linked to, else a song folder with the same normalised artist + title. A song **with** a recording is used as it is (its mix is never replaced); one without a recording, or no match, gets a §1 download job (`POST /api/usdb/download` with `youtubeUrl`, `videoMode: 'none'`, and `songId` for the existing folder), searched via `GET /api/youtube/search` (client: `src/lib/companion/songDownloadApi.ts`). After the job is done the piece on stage is linked to the song (`PUT /api/notes/pieces/:id` with `songId`), or — for a score not yet in the library — a new piece with `songId` is created and the score uploaded into it; it is opened with the song's mix and aligned right away.

`alignRecording` (`src/modules/music-score/alignment.ts`) produces one mark per bar in two stages: a coarse match, then `fitMarksToNotes` (whole-song Viterbi fit of the score's attacks to band and pitch-class onsets, ±0.6 s per bar). The coarse match depends on the score:

- **Pitched parts present:** tuning estimate, semitone-shift search and a chroma + onset DTW (`warpScoreToAudio`, `marksFromWarp`). The DTW may leave up to 30 s of score unmatched at either end (an arrangement's intro or outro the recording lacks); a skipped frame costs 0.89 × the song's mean cost of unrelated frame pairs (`unrelatedCost`), and skipped bars continue the tempo of the matched path, so bars before the recording get negative times (`fitMarksToNotes` leaves those unclamped). The stage starts at the first bar with a mark at or after 0 s (`firstRecordedBeat`, `StageRecording.startBeat`): earlier bars get no notes, no band and no count-in, and the timeline cannot seek before it. The shift search does not skip.
- **Drums only** (`hasPitchedNotes` is false, `onsetAlign.ts`): there is no pitch to follow, so `estimateTempoAndStart` cross-correlates (FFT) the score's kick/snare/cymbal attacks with the recording's band onsets (`onsetFeatures`) for tempo ratios 0.7–1.4, and `marksFromOnsets` places every bar start jointly by a Viterbi on a 20 ms grid (each bar at most 10 % off the global tempo, at a cost; free start). Bars without attacks, such as an intro without drums, follow the tempo around them. `tuning.semitones` is 0.

## 5. Song folder layout

No fixed file names — whatever the `.txt` headers reference:

```
<library dir>/<Artist - Title>/
├── <name>.txt                 # UltraStar lyrics + #MP3/#VIDEO/#COVER headers
├── <audio>.mp3|m4a|…          # master audio
├── <… Vocals …>.mp3           # stem (optional)
├── <… Instrumental …>.mp3     # stem (optional)
├── <video>.mp4                # optional (or stream URL in the .txt)
├── <cover>.jpg|png            # optional
├── <score>.mxl|musicxml|mid   # legacy sheet music: imported into the Notes library once (Q18)
└── <score>.marks.json         # legacy bar marks for that score (copied with it)
```
