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
  method: 'read server/src/plugins/melodiq/{services/download.ts,services/separator.ts,services/usdb.ts,routes/*.ts}, server/src/scripts/align_lyrics.py'
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

1. **Target folder** — `downloadDir`, else the first configured directory, else cwd; one sub-folder per song (sanitised name).
2. **Lyrics** — reuse an existing local `.txt` with notes, else log in to USDB (`usdb.animux.de`, credentials via `POST /api/config/usdb-credentials`) and fetch `?link=gettxt&id=<usdbId>`. Without credentials/ID a minimal `.txt` is generated.
3. **YouTube URL** — taken from the request or resolved by search (`GET /api/youtube/search`).
4. **Cover, audio, video** — via `yt-dlp`. Video either downloaded (`bestvideo[ext=mp4]+bestaudio[ext=m4a]/…`) or, in `stream` mode (`defaultDownloadMode`, default `stream`), only the stream URL is written to the `.txt` header.
5. **Write `.txt`** with media headers, rescan, and — if `autoVocalSeparation` is enabled in config — queue a separation job.

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

A song folder may also hold sheet music: `.mxl`, `.musicxml`, `.mid`/`.midi`, and `.xml` when the file is MusicXML (sniffed for `<score-partwise>`/`<score-timewise>`). The scanner lists them as `Song.scores` (`services/scoreFiles.ts`); the client receives `{ file, url, hasMarks }` per score, where `url` is a `/media` URL with a `v=<mtime>` parameter so replaced files are not served from cache.

| Endpoint                                | Purpose                                                                                                                    |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/songs/:id/scores`            | upload a score (multipart field `file`, max 20 MB; never overwrites — an existing name gets a number, e.g. `name (2).mxl`) |
| `GET /api/songs/:id/scores/:file/marks` | bar marks aligning the score with the recording (`no-store`)                                                               |
| `PUT /api/songs/:id/scores/:file/marks` | store bar marks `{ marks: [{ beat, sec }], offsetSec?, audio? }` (strictly increasing) as `<file>.marks.json`              |
| `DELETE /api/songs/:id/scores/:file`    | remove score and marks (master token or API key with `allowSongDeletion`)                                                  |

The server does not search or download sheet music: users fetch MusicXML themselves (for example from musescore.com with their own account) and drop it into the folder. Alignment runs in the client (`src/modules/music-score`), the server only stores the result.

Melodiq Notes shows these scores in its one sheet-music library, merged with the Notes library pieces (plugin `notes`, `NOTES_DIR`) by normalised artist + title (`src/games/melodiq-notes/stage/logic/scoreCatalog.ts`), with a "Melodiq song" badge. They are read-only there: the app only writes their bar marks (`PUT …/marks`) while the score plays with the song's mix; with a recording chosen on the device, saving creates a Notes library piece (original score file, recording, marks) instead. The client no longer calls `POST /api/songs/:id/scores`; the route stays for now ([Q18](../open-questions.md#q18--one-storage-place-for-melodiq-notes-sheet-music-534)).

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
├── <score>.mxl|musicxml|mid   # optional sheet music (Melodiq Notes)
└── <score>.marks.json         # optional bar marks for that score
```
