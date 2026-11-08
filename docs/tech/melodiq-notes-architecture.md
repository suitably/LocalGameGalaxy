---
type: Game Architecture
title: Melodiq Notes Architecture
description: Engine, timing and latency model, pult protocol and song sources of Melodiq Notes (band stage for up to four players).
resource: src/games/melodiq-notes/
tags: [melodiq-notes, engine, latency, pult, room-game, music-score]
status: stable
generated:
  at: 2026-11-08T23:00:00+01:00
  by: claude-code
verified:
  at: 2026-11-08
  method: 'Read stage/engine/{players,input,transport,remote}.ts, stage/useStage.ts, stage/logic/judging.ts, pult/logic/{protocol,stageClock,clockSync}.ts, pult/{usePult,useStageRoom}.ts, stage/{loadScore,serverScoreLoad}.ts; constants confirmed with grep. Rendering and the mic/MIDI input paths were not read line by line.'
sources:
  - 'src/games/melodiq-notes/stage/engine/'
  - 'src/games/melodiq-notes/stage/useStage.ts'
  - 'src/games/melodiq-notes/pult/'
  - 'src/modules/room-game/'
  - 'src/modules/music-score/'
---

# Melodiq Notes Architecture

Melodiq Notes (`src/games/melodiq-notes`, registry id `melodiq-notes`) is a band stage: up to four players on one screen, each on a part of a score (keys, strings, drums, sung pitch, notation). It is a different game from [Melodiq karaoke](melodiq-architecture.md) (host/TV/phone, stems); the only link is the song folder ([song-pipeline §4](song-pipeline.md#4-sheet-music-for-melodiq-notes)). Origin of this page: [analysis 2026-11-08 §1](../reports/2026-11-08-melodiq-notes-and-tabletop-analysis.md).

## 1. Engine

- `StageEngine` (`stage/engine/StageEngine.ts`) is framework-free: it owns players, transport, band/recording, mode (`learn | practice | perform`, `StageMode`) and play state (`idle | playing | paused | done`, `PlayState`), both in `stage/engine/types.ts`. React reads it with `useSyncExternalStore` in `stage/useStage.ts`.
- `PultEngine extends StageEngine` (`pult/PultEngine.ts`): the same rules on a player's own device, judging that player's part only.
- Rules live in pure helpers that take the engine as argument: `stage/engine/advance.ts` (per-frame advance, misses, learn-mode waiting), `stage/engine/transport.ts` (seek, loops, practice bars, recording sync), `stage/engine/input.ts` (a played lane or pitch becomes a judgement), `stage/engine/players.ts` (seats, `MAX_PLAYERS = 4`), `stage/engine/remote.ts` (pult events applied to the stage). Scoring and windows are in `stage/logic/judging.ts` (`PERFECT_SEC` 0.06, `GOOD_SEC` 0.14, `LEARN_EARLY_SEC` 0.25, `stars`, `multiplier`); charts in `stage/logic/charts.ts` (`buildChart`).
- Renderer: canvas, one view per instrument family in `stage/render/` (`keysView`, `stringsView`, `drumsView`, `pitchView`, `notationView`), driven by `stageRenderer.ts`.
- Sound: `BrowserStageSound` (`stage/engine/browserSound.ts`) behind the `StageSound` interface; recording playback via `stage/engine/browserRecording.ts`.

## 2. Timing and latency model

- **Frame clock.** The audio clock advances in blocks, so time runs on `performance.now()` and is pulled towards the audio clock each frame: `CLOCK_PULL` 0.05, hard snap beyond `CLOCK_SNAP_SEC` 0.1 s, frame step capped at `MAX_FRAME_SEC` 0.05 (`stage/useStage.ts`). React is notified of beat progress at most every `PROGRESS_REFRESH_MS` 250 ms.
- **Output latency.** `BrowserStageSound.outputLatency()` (`outputLatency + baseLatency`, capped at 0.5 s) is used by `heardBeat` (`stage/engine/transport.ts`): the stage draws that much behind the song clock, because sound is heard that long after it is scheduled.
- **Input latency.** `StageEngine.inputLatencyMs` is subtracted from the hit time: `focused()` in `stage/engine/input.ts` judges at `beat − latency / secPerBeat`. Calibrated by tap-along (`stage/useTapCalibration.ts`, `stage/engine/calibrationClicks.ts`) and set in `stage/useInputLatency.ts`; on a pult the same value feeds `toStageTime` (`pult/logic/clockSync.ts`), clamped to `MAX_INPUT_LATENCY_MS` 500.
- **Recording.** `syncRecording` (`stage/engine/transport.ts`) seeks the backing recording when it is more than `RESEEK_SEC` 0.25 s (× speed) away from the song clock, pauses it in learn-mode waits and re-seeks after loops. Exact seeking of inexact MP3s: `stage/useExactRecordingUrl.ts` / `stage/logic/exactSeek.ts`. **Unverified:** the WAV re-encode details.
- **Learn mode** waits for the player (`learnWait` in `advance.ts`); with a pult, the stage waits for the pult's judgement, so it waits at least the pult latency plus RTT by design.

## 3. Pult protocol

Spec is the code: `pult/logic/protocol.ts` ([ID: GAME-MELODIQ-NOTES-PULT-PROTOCOL]). The stage (TV/laptop) owns clock and score; each pult (a player's phone) follows the clock, judges locally and reports. Two channels over [`modules/room-game`](architecture.md#32-shared-modules-srcmodules) (`useRoomReducer`, `useRoomEvents`, `PULT_GAME_KEY = 'melodiq-notes-pult'`):

- **Room state** (`PultRoomState`, host-run `pultRoomReducer`, authorisation in `pultRoomAllows`): host id, song summary (`PultSong.key` changes per loaded song), `PlayState`, members (`PULT_MAX_MEMBERS` 4). One pult per part; the first keeps it; `freePart` picks a free one.
- **Live events** (`PultEvent`, fire-and-forget): `ping`/`pong` (clock offset), `clock` (`StageClock`: `songKey`, `at`, `beat`, `startBeat`, `rate`, `play`, `mode`, `loop`), `chart-request`/`chart` (`PackedChart`, `pult/logic/pultSong.ts`), `input` (display only), `judged` (`seq`, `marks`, `score`), `click-request`/`click-plan` (tap calibration).
- **`seq`.** Each batch of `judged` carries a growing `seq`; `applyRemoteJudged` (`stage/engine/remote.ts`) ignores a batch with `seq` ≤ the last one of that player, and one for another `songKey`.
- **Clock sync.** The pult pings (`FAST_PING_MS` 300 until settled, then `SLOW_PING_MS` 3000, `pult/usePult.ts`); `clockSample`/`estimateOffset` (`pult/logic/clockSync.ts`) keep 16 samples and take the median offset of the 4 with the shortest RTT. `stageBeatAt`/`followBeat` (`pult/logic/stageClock.ts`) extrapolate the beat from the latest `clock` (pull `FOLLOW_PULL` 0.1, snap beyond 0.15 s). No drift model: the offset is constant between estimates.
- **Heartbeat.** The stage sends `clock` every `CLOCK_HEARTBEAT_MS` 2000 (`pult/useStageRoom.ts`; **Unverified:** whether it also sends on transport changes); a pult re-sends `chart-request` every `CHART_RETRY_MS` 1500 until it has the chart.

## 4. Song sources

- Entry: `stage/loadScore.ts` `readScoreFile(fileName, data)` picks the parser by extension (`.mid/.midi` → `parseMidi`, `.gp` → `parseGuitarPro`, `.mxl` → `extractMxl`, else MusicXML → `parseMusicXml`), all from `src/modules/music-score` (barrel `index.ts`; also UltraStar `ultrastar.ts`/`ultrastarScore.ts`, alignment/warp for recordings).
- `SongOrigin` (`stage/serverScoreLoad.ts`): `example` (built-in `demoSongs.ts` and device files), `file`, `notes` (score in a song folder, #568), `karaoke` (vocal part of a Melodiq `.txt`, #566). Server loading: `loadSongScore`, `loadKaraokeVocals`.
- Local library: Dexie (`logic/db.ts`, `StoredSheetMusic`, `StoredFolderHandle`), `hooks/useSongLibrary.ts`, `logic/folderSync.ts`. Known gaps (legacy regex parser `logic/musicXmlParser.ts`, folder import bypassing `readScoreFile`): analysis §1.3.

## Related

- [Melodiq karaoke architecture](melodiq-architecture.md), [song pipeline](song-pipeline.md), [game catalog](game-catalog.md)
