---
type: Game Architecture
title: Melodiq Karaoke Architecture
description: Architectural specification of the Melodiq karaoke module, dual-path video sync, pitch evaluation, and controller separation.
resource: src/games/melodiq/
tags: [melodiq, karaoke, audio, pitch-detection, ultrastar]
status: stable
generated:
  at: 2026-09-27T10:00:00Z
  by: previous-agent
verified:
  at: 2026-11-22
  method: '2026-11-22: §2.16 table checked against event names in logic/ and hooks (#820); §2.12 written from code (#636); §2.11 written from code (#604); 2026-11-14: §2.9 / §2.10 written from code and measurements; rest 2026-10-18 audit: paths, links and identifiers resolved against code, content spot-checked; prose not re-verified line by line'
---

# Melodiq Architecture

> Melodiq **Notes** (band stage, sheet music, pults) is a separate game: see [melodiq-notes-architecture.md](melodiq-notes-architecture.md).

> [!IMPORTANT]
> This document details the specific architecture of the **Melodiq** game module. It outlines the core components, state synchronization mechanisms, and architectural guidelines.

## 1. High-Level Architecture

Melodiq is a local karaoke/rhythm game that supports three distinct roles/views, communicating seamlessly:

1.  **Host (PC/Laptop)**: The primary game engine. It manages the queue, downloads songs, plays the master audio, and calculates scores. Entry point: `MelodiqGame.tsx`.
2.  **TV Mode (Presentation)**: A secondary display window or Chromecast target. It displays lyrics and visualizations, perfectly synchronized with the Host. Entry point: `MelodiqTV.tsx`.
3.  **Client/Singer (Smartphone)**: A mobile interface accessed via QR code. It allows players to search songs, add them to the queue, and stream microphone audio to the host via WebRTC. Entry point: `PhoneClientEngine.tsx`.

## 2. Component Structure (SOLID Overview)

Melodiq follows a strict separation of concerns, divided into domains:

### 2.1 State & Global Context

- `SettingsContext.tsx` & `useSettings.ts`: Manages user preferences (mic latency, theme). The UI is the registered settings sections in `settings/` (`MelodiqProfilesSection`, `MelodiqGameplaySection` for the host, `MelodiqClientSection` for phones), shown in the header gear's settings sheet and on `/settings/games/melodiq`; microphones are app scope (`/settings/audio`).
- `useQueue.ts`: Manages the global song queue. Synced across tabs using `BroadcastChannel`.
- `useMelodiqGlobalEvents.tsx`: Orchestrates cross-component events (e.g., auto-playing the next song when TV connects).

### 2.2 Host & Game Loop

- `PlaybackManager.tsx`: Container component. Manages the audio elements and acts as the bridge between the UI and the actual gameplay session.
- `MelodiqSession.tsx`: The core game loop container. It picks the screen (load error, loading, folder prompt, score board, stage); the session state (media, audio, players, scoring, passive sync, imperative handle) lives in `gameplay/hooks/useMelodiqSessionCore.ts` and the playing stage in `gameplay/components/SessionStage.tsx`.
- Stage chrome: `gameplay/hooks/useStageChrome.ts` (rule in `gameplay/logic/stageChrome.ts`) hides the header bar, title and minimize button 3.5 s after the last interaction while a song plays; a tap or mouse move shows them again with `SessionTransportControls` (play/pause, next) on the video. Scores and the progress line stay. The TV view (`isTVMode`) uses the same rule with `TV_STAGE_CHROME_HIDE_MS` (8 s, read from a distance, nobody can recall it) and has no transport buttons: it mirrors the host and has no pointer. TV sizes follow DESIGN.md §3.3: `ScoreDisplay`, `DuetPart` and `SessionTopControls` switch variants and padding on `useIsTvMode()` / `isTVMode` (48 px gutter, no hard-coded font size), the lane label in `drawOverlays` takes a `tv` flag.
- Lyrics-only stage: without a pitch lane `lyricsOnlyLineCount` (`gameplay/logic/lyricsLines.ts`) raises the line count above the `lyricsLines` setting (portrait phone: 5 solo, 3 per duet part; otherwise 3 in the centred layout).
- YouTube backgrounds: `disableYouTubeCaptions` (`gameplay/youtubeApi.ts`) unloads the player's caption module on `onReady` and `onApiChange`; no player parameter can turn the video's own subtitles off.
  - _Logic Hooks_: `usePlaybackControls.ts` (Play/Pause), `usePassiveSync.ts` (TV/Client sync), `useSessionEnd.ts` (Scoreboard transitions).
  - _Presentational Components_: `LyricsDisplay.tsx` (lanes in `lyrics/`), `PitchVisualizer.tsx` (canvas drawing in `pitch/`), `ScoreBoard.tsx` (parts in `scoreboard/`).

### 2.3 Network & Synchronization

- **TV Sync**: `useTVMode.ts` uses the `Presentation API` and `BroadcastChannel` to send `PLAY_SONG`, `STOP_SONG`, and `GAME_STATE` to `MelodiqTV.tsx`.
- **Song queue (host to phones)**: room state plus request events, §2.13.
- **Audio Streaming**: `WebRTCContext.tsx` and `MicrophoneManager.ts` handle low-latency audio streaming from phone mics to the host browser.

### 2.4 Audio Stem Separation & Playback Mode

- **Separation Backend**: `server/src/plugins/melodiq/services/separator.ts` and `scanner.ts` extract and index separated stems (`(Instrumental)`, `(Vocals)`).
- **Playback Modes**: Configurable via `settings.audioPlaybackMode` (`'separated'` vs `'original'`):
  - `'separated'`: Plays instrumental on master audio element and vocal stem on secondary audio element; `useLocalMediaSync.ts` keeps the stem on the master (§2.9). Allows independent vocal volume reduction.
  - `'original'`: Plays the untouched original mix directly without secondary vocal stem.
- **Audio Track Resolution**: `useMediaLoaders.ts` resolves stem paths and URLs automatically based on the user's selected mode and available files.

### 2.5 Resume after reload / route change

- `useQueue.ts` persists the running song as `STORAGE_KEYS.NOW_PLAYING`; `usePlaybackReporting.ts` writes its position about once per second to `STORAGE_KEYS.MELODIQ_SAVED_TIME` (`{ id, time }`).
- `useMelodiqPlayback.ts` seeds `restoredSong` from `NOW_PLAYING` plus the saved position (`logic/savedPlayback.ts`). The MiniPlayer shows it as "Paused"; resume (`useRestoredResume.ts`) continues at that position, the restart button plays it from the beginning and drops the saved position.

### 2.6 Part choice and joining on the phone

- The host sends every phone that has a player `songInfo` with the part names, that player's `trackIndex` and `singing` (false while the player is hidden, i.e. a spectator) (`useBroadcastSongInfo.ts`); it is re-sent when players join or leave and whenever a remote player's part or visibility changes.
- On a phone (`isClient`), `usePhoneClientMessages.ts` reads it (`parseAssignedTrack` in `gameplay/logic/trackChoice.ts`) and hands it to `usePhoneTrackChoice.ts` (`reportTrackAssignment`). `PhonePartChoiceProvider.tsx` (mounted by `PersistentSessionLayer.tsx` only on phones) puts the hook's result in `LyricsPartContext`; `LyricsDisplay.tsx` then shows a `PartMicButton` per duet lane in the lane colour (blue / pink), filled for the part the phone sings, and for solo songs a join mic while the phone only watches. Host and TV render no mics.
- Tapping a mic sends `{ type: 'trackSelect', trackIndex }` through `sendClientData` of `PhoneClientEngine.tsx`. On the host, `usePeerSessionMessages.ts` unhides a hidden player the host list allows and calls `switchTrack`; `useHostPhoneJoin.ts` adds a phone that is not on the host's singer list (`addJoiningPhone` in `logic/sessionRoster.ts`, same entry as the participant dialog), so `useSessionOverrideSync` creates its singer. The phone asks for its part again until `songInfo` reports it (`pendingTrackRequest`), and re-sends it after a reconnect.
- The host's own P1 / P2 switch (`HostPartToggle.tsx`) is shown only for local-mic singers; phone singers pick their own part.

### 2.7 Remote host settings (phone to host, room events)

Admin phones adjust a few host settings without mounting the desktop `<Settings>` and without touching the phone's own storage. The requests are room events on the Melodiq room transport (#816, step 3 of #813; wiring in §2.8), typed in `logic/hostSettingsRpc.ts`:

| Direction     | Event                                            | Meaning                                                            |
| ------------- | ------------------------------------------------ | ------------------------------------------------------------------ |
| phone to host | `{ type: 'settings.get', from }`                 | ask for the current values                                         |
| phone to host | `{ type: 'settings.set', from, patch }`          | change values (`Partial<HostSettings>`)                            |
| host to phone | `{ type: 'settings.state', from, to, settings }` | host's current `HostSettings` to the requester (`to` = its `from`) |

- `HostSettings` (`types.ts`) is a fixed subset of `SettingsState` (volumes, playback mode, lyrics options, note labels, scoreboard QR). The patch guard `sanitizeHostSettingsPatch` keeps only those keys with values of the right type (and clamps ranges); unknown keys and wrong types are dropped, so helper URL or token can never be set this way.
- Authorization: the host transport stamps `from` with the sender's device id; `handleHostSettingsEvent` looks up the role with `getRoleForDevice(from)` only, never a payload value. Non-admins get no reply and nothing is applied (`console.warn`); a request without `from` is dropped.
- Host: `HostSettingsRpcBridge.tsx` (mounted next to `PhoneQueueBridge`) runs `hooks/useHostSettingsRpc.ts`, which applies a `set` through `updateSetting` (host storage) and replies with the merged state.
- Phone: `RemoteHostSettingsModal.tsx` (opened from the header action "Host settings", rendered by `PhoneClientEngine` only for `clientRole === 'admin'`, gets the engine's room transport as `room`) uses `hooks/useRemoteHostSettings.ts`: `settings.get` on open and after a reconnect while open, `settings.set` per change; it keeps the last valid `settings.state` addressed to this phone.

### 2.8 Feedback via host (phone to host, room events)

While a phone is connected to a host, feedback is not sent with the phone's own PAT but as room events (#145, #815; step 2 of #813):

- Wiring (shared with later Melodiq room features): `hooks/useMelodiqRoomTransport.ts`. Host: `useMelodiqRoomTransport()` returns `{ transport, roomId, selfId } | null` from `createHostPeerTransport(manager)` (party id as `roomId`). Phone: `PhoneClientEngine` builds `usePhoneRoomTransport({ link, roomId, selfId, isConnected })` (`createClientPeerTransport` around `useWebRTCClient`'s `sendData` / `addMessageListener`) and shares it via `PhoneRoomTransportProvider`; `selfId` is the profile `deviceId` the host sees from `identify`. Use with `useRoomEvents({ gameKey: MELODIQ_GAME_KEY, roomId, transport })` (channel `melodiq_<roomId>_live`).
- Events (`logic/feedbackRpc.ts`): `{ type: 'feedback.submit', from, reqId, title, body }` phone to host; `{ type: 'feedback.result', from, to, reqId, success, issueUrl?, error?, code? }` host to that phone. The host transport overwrites `from` with the sender's device id; receivers ignore events whose `to` is not their id.
- Phone: `hooks/useFeedbackRelay.ts` registers a relay in `src/lib/feedbackRelay.ts`; `submitFeedback` (`src/lib/github.ts`) tries it first and resolves on the `feedback.result` with the matching `reqId` (20 s timeout). The result is shown by the normal `FeedbackForm`. The feedback dialog opens without a local PAT while the relay is active.
- Host: `HostFeedbackBridge.tsx` / `hooks/useHostFeedback.ts` run `handleFeedbackEvent` (guards and caps, one request per `from` per 10 s, any connected phone) and create the issue with the host's PAT (`submitFeedbackWithLocalPat`). Without a host PAT it answers `code: 'no_token'`.
- Fallback: on `no_token`, error or timeout, `submitFeedback` uses the phone's own PAT if it has one, then the server proxy as before.

### 2.9 Timing: one song clock, everything else follows

Four things must agree: instrumental, vocal stem, lyrics / pitch lanes, and the singers' scored pitch. The rule: the instrumental `<audio>` of the **host** is the song clock (`audioRef.current.currentTime`); nothing else keeps time of its own.

| Follower                                | How it follows                                                                                                                                                                                                                                                                                              | Code                                       |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Lyrics, pitch lanes, scoring (host)     | read the clock every frame (`timeProxyRef`), scoring subtracts the player's and the global mic latency                                                                                                                                                                                                      | `LyricsDisplay.tsx`, `useScoringEngine.ts` |
| Vocal stem, background video (any view) | second decoder, steered by `correctDrift` (`gameplay/logic/mediaDrift.ts`): hysteresis: untouched up to 25 ms (stem) / 60 ms (video), then one fixed rate change of 1 % / 5 % until back under 5 ms / 20 ms, seek above 120 ms / 500 ms; stem paused while the instrumental buffers (`waiting` / `playing`) | `useLocalMediaSync.ts`                     |
| TV audio (passive, audible)             | follows the host's position estimated by `createRemoteClock` (`gameplay/logic/remoteClock.ts`): same hysteresis on the smoothed offset (engage 40 ms, release 10 ms, 1.5 % rate, seek above 250 ms); on resume it is set to the host's position                                                             | `usePassiveSync.ts`                        |
| Phone lyrics (passive, no audio)        | `virtualTimeRef` advances per frame and is re-set to the remote clock when more than 30 ms off                                                                                                                                                                                                              | `usePassiveSync.ts`, `useScoringEngine.ts` |

- `createRemoteClock` is a minimum-delay filter: of the `GAME_STATE` reports of the last 3 s the one that arrived fastest gives the offset, between reports the position runs on `performance.now()`. Device wall clocks are never compared (`hostTimestamp` is unused).
- Measured 2026-11-14 with the real hooks in headless Chromium against stems of the maintainer's server (8 songs): the files are sample-aligned (original vs. instrumental + vocals: 0.0 ms at start, middle and end; stems are 320 kbit/s CBR MP3 of equal size, so both seek to the same frame). In playback the stems stay within 0–3 ms. Before this change a stem offset below 20 ms was never corrected (11.6 ms stayed after a seek under CPU throttling) and a 90 ms offset was still 46 ms after 16 s; now both are below 3 ms within about a second.
- Rate changes are kept rare on purpose: every `playbackRate` change restarts the browser's time stretcher, which is audible and shifts the position. A proportional controller (first version, 2026-11-14) changed the rate about 20 times per second on a TV's stem and 6 times per second on its instrumental, and the stem jumped by 20–45 ms every few seconds (headless Chromium, host tab + TV tab, "Alles nur geklaut"); with hysteresis the same run has 2 rate changes in 30 s and the stem stays within 3 ms.
- Known limits: MP3 seeks land on a frame (26 ms), so lyrics can be up to one frame off the audio after a seek. Output latency of the speaker path (TV, Bluetooth) is not known to the browser; it is covered by the latency calibration per player.
- **Unverified:** TV-follows-host and the phone clock are covered by unit tests of the two logic modules only, not measured on a real TV / cast device or phone.
- Not done (larger change): one decoder for both stems (a multi-channel file split with a Web Audio `ChannelSplitterNode`, or both stems as `AudioBuffer`s started on one `AudioContext` time) would make stem drift impossible instead of corrected; it needs a server pipeline change or about 170 MB of decoded audio per song.

### 2.10 Whose pitch lanes a screen shows

`laneScope` / `playersInScope` (`gameplay/logic/stageLanes.ts`, used by `filterVisiblePlayers`): a shared screen (TV, laptop, tablet) shows every singer. A phone is one singer's screen: a phone client shows its own singer (the host's `GAME_STATE` player `config.deviceId` is kept on the passive player for that), a hosting phone without a TV shows the singers on its own microphone (`hasTv` session prop from `isTVConnected`), and with a TV it keeps all lanes as the controller. "Phone" is a coarse pointer with a short screen side of at most 600 px (`usePhoneScreen.ts`). Duet lyrics always show both parts (the phone picks its part there, §2.6).

### 2.11 What a song sings: ScoreSong vocal parts (#604)

Gameplay reads the vocal parts of the shared `ScoreSong` (`src/modules/music-score/types.ts`, epic #565), not a parsed `.txt` of its own; Melodiq has no UltraStar parser any more (`src/games/melodiq/parser.ts` and `ParsedSong` are gone).

- `songVocals` (`logic/songVocals.ts`): a karaoke `.txt` goes `parseUltraStarTxt` → `ultraStarToScore` → `scoreToSungSong` (all in `modules/music-score`); a song without `.txt` sings the vocal part of its score (`{ song, marks }`), timed by its bar marks, or by the score's tempo map without marks. With both, the `.txt` wins. The result (`SongVocals`: `tracks`, `bpm`, `gap`, `headers`) is the gameplay view model; `Note` / `SongTrack` / `SongWithNotes` are exported there.
- `scoreToSungSong` (`modules/music-score/sungSong.ts`): a score from a `.txt` (phrase breaks, one tempo, marks exactly on `#BPM` / `#GAP`) maps back exactly — same beats, pitches, kinds (`*`, `F`, `R`, `G`) and `-` line breaks; lyric text is rebuilt from the syllables (a leading space starts a new word, never at a line start). Any other score goes on an UltraStar grid through `scoreToUltraStarGrid`, the structured core of the `.txt` export (#567): default `#BPM` from the marks, `#GAP` at the first note, line breaks from phrase breaks or pauses. Parts: every vocal part of a karaoke score; else both parts of a two-part vocal score (a duet), else the first vocal part.
- `useSongVocals` (`gameplay/hooks/useSongVocals.ts`) feeds the session (`useMelodiqSessionCore`): scoring (`useScoringEngine`, note rules in `gameplay/logic/noteScoring.ts`: `isScoredNote`, `activeNoteIndex`, `pointsPerBeat`), lyrics, pitch lane, duet tracks and the phone `songInfo` all read `tracks`; media names come from `headers`.
- Parity: `logic/songVocals.test.ts` checks that solo, duet, golden, freestyle and rap `.txt` fixtures give the same notes, line breaks and scores through the old `ParsedSong` shape and through `ScoreSong`, and that a score-only song produces sung lines; `logic/scoreVocals.test.ts` covers listing, score choice, marks and the failure reasons.
- Songs without `.txt` (#604): `fetchServerSongs` (`logic/serverSongsProvider.ts`) asks `/api/songs?all=1` and keeps karaoke songs plus songs with sheet music (`isSingableServerSong` in `logic/scoreVocals.ts`; whether a score has a vocal part is only known after reading it, the server does not parse scores). `processServerSongs` keeps `scores` on the `Song`. Without `txtContent`, `useSongVocals` runs `loadScoreVocals`: scores with bar marks first, else folder order (`scoreCandidates`); each is fetched (`fetchCompanionFile`) and read (`readScoreBytes`, `modules/music-score/readScore.ts`, shared with Melodiq Notes' `readScoreFile`) until one has a vocal part (`sungParts`); its `.marks.json` (`getSongMarks`) times it when the marks belong to the song's mix (`marksForMix`, fine-tune offset applied), else the score's tempo. Failures show an i18n message (`melodiq.session.no_vocal_part`, `score_load_failed`, `no_lyrics`, `parse_failed`; `loadError` is an i18n key). Phones get the song list from the host; a phone reading a score needs the companion server itself.
- The library scan (`logic/localLibraryProvider.ts`) reads `.txt` header fields with the shared `parseUltraStarTxt`.

### 2.12 Song library: artists, albums, favourites, playlists (#636)

Maintainer decision 2026-11-07, open points in [ADR-0010](../adr/0010-melodiq-song-library.md).

- UI: `MelodiqHomeView` puts `LibraryTabs` (All / Artists / Albums / Favourites / Playlists, scrollable on a phone; Playlists hidden on phone clients) under the search bar. "All" is the old song grid/list (`LocalSongsView`); the other tabs render `components/library/SongLibraryView.tsx`: Artists and Albums are accordions (`LibraryGroupList`, one group open), song rows (`LibrarySongRow`) carry a favourite heart and a menu button that opens the song action menu; Playlists embeds `MelodiqPlaylists`, and a picked playlist opens the `PlaylistDetails` view (`useMelodiqNavigation().openPlaylist`). The song action menu has a favourite toggle too. Search and the genre/edition filters apply to every tab; the search matches every word in title, artist or album (`filterLibrary`).
- Logic (pure, tested): `logic/songLibrary.ts` (`groupByArtist`, `groupByAlbum`, unknown artist/album last, `filterLibrary`, `toggleFavorite`, playlist list helpers); `components/library/libraryGroups.ts` maps the groups to labelled accordion entries.
- Album: UltraStar `#ALBUM` (server scanner and local scan), else `song.json` `album` (server); empty is shown as "Unknown album".
- Store: `logic/songLibraryStore.ts` defines `SongLibraryStore`; `chooseLibraryStoreKind` picks the **companion** store (`/api/melodiq/library/*`, per API user) when the companion is active and no local folder is used, else the **local** store (favourites in `STORAGE_KEYS.MELODIQ_FAVORITES`, playlists in the existing Dexie `playlists` table).
- State: `hooks/SongLibraryProvider.tsx` (mounted inside `SongsProvider`, so every Melodiq screen shares one copy) loads both lists, writes optimistically and reloads on a failed write; `useSongLibrary()` reads it, `usePlaylists()` is the playlist view of it (own vs. shared by others).
- Server routes: [song-pipeline §3](song-pipeline.md#3-library-and-media-endpoints); the old `/api/playlists*` routes and the playlist auto-sync toggle are gone.

### 2.13 Song queue (host state and phone requests, room API)

The host's `useQueue.ts` (`QueueProvider`, host storage) stays the source of truth; phones see it as host-run room state and change it only through request events (#817, step 4 of #813; wiring in §2.8). Logic: `logic/queueRoom.ts`.

- Room state: `useRoomReducer` with `gameKey: 'melodiq-queue'` (`QUEUE_ROOM_GAME_KEY`, channel `melodiq-queue_<roomId>`), state `{ queue, nowPlaying }`, one action `{ type: 'HOST_QUEUE', queue, nowPlaying }`. `queueRoomAllows(hostId)` accepts it only from the host's own id (`'host'`). `keepAlive: false` on both sides (the transport option disables it anyway): the peer follows the host link, so a reconnect (also after a host restart) starts a fresh guest that takes the host's next state.
- Host: `PhoneQueueBridge.tsx` runs `hooks/useHostQueueRoom.ts`, which dispatches `HOST_QUEUE` whenever `queue` / `nowPlaying` change. Late joiners get the state through the room's hello/state handshake.
- Phone: `QueueProvider` takes `queue` / `nowPlaying` from `hooks/usePhoneQueueRoom.ts` (phone room via `usePhoneRoom()`, null on the host) and sends its changes as requests; `useSongSelection.ts` sends `queue.select_song` through `useQueueRequestSender()`. Phone-only `moveItem` / `addNext` / `clearQueue` have no request and do nothing on a phone.
- Requests (Melodiq room events, `gameKey: 'melodiq'`), checked by `handleQueueEvent` against `getRoleForDevice(from)` (the transport-stamped sender) and ignored unless `from` is a connected phone:

| Event                                                                       | Allowed for                                                                 | Host call                                                            |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `{ type: 'queue.add', from, songId }`                                       | everyone but `singer`                                                       | `addToQueue(song, peerName, from)`                                   |
| `{ type: 'queue.select_song', from, songId, forcePlay }`                    | everyone but `singer`; `forcePlay` only for `admin` / `queue_manager`       | DOM event `melodiq_remote_select_song`                               |
| `{ type: 'queue.remove', from, itemId }`                                    | `admin` / `queue_manager`; `queue_contributor` for entries it added         | `removeFromQueue`                                                    |
| `{ type: 'queue.reorder_participant', from, itemId, startIndex, endIndex }` | as `queue.remove`                                                           | `reorderQueueParticipant`                                            |
| `{ type: 'queue.toggle_participant', from, itemId, deviceId, profile? }`    | the sender toggling itself (device or peer id), otherwise as `queue.remove` | `toggleQueueParticipant` (profile defaults to the peer's name / hue) |

- `helper_config` stays a direct data-channel message (#813 decision 7): the phone asks with `{ type: 'helper_config.get' }` 500 ms after connecting (`PhoneClientEngine.tsx`, replaces `queue.get`) and `PhoneQueueBridge.tsx` answers that peer with `helper_config`. Besides the queue room and this reply, `PhoneQueueBridge` only mounts `useHostLibrarySearch` (§2.14). The old `queue.update`, `queue.get` and `remote.select_song` messages are gone.

### 2.14 Library search (room events)

- Pure logic `logic/librarySearch.ts` [ID: GAME-MELODIQ-LIBRARY-SEARCH]: `searchLibrary(songs, query, filters)` (genre, year or decade like `2010s`, language, then title/artist text; first 50 songs, stripped to id/title/artist/year/genre/language), parsers, `handleLibrarySearchEvent` (host) and `handleLibraryResultsEvent` (phone).
- Events on the Melodiq room events channel (`useRoomEvents`, `gameKey: 'melodiq'`): `{ type: 'library.search', from, reqId, query, filters }` phone to host; `{ type: 'library.results', from, to, reqId, results }` host to the requester only (`to` = the request's `from`; other phones ignore it). The old direct `library.search` / `library.results` data-channel messages are gone.
- Host: `hooks/useHostLibrarySearch.ts` (mounted by `PhoneQueueBridge`). Phone: `hooks/usePhoneLibrarySearch.ts` (`search()`, `results` of the latest `reqId` only; stale replies are dropped). **Unverified:** no phone UI calls it yet (the old message had no sender in the code either).

### 2.15 Phone remote commands (room events)

- Pure logic `logic/remoteCommands.ts` [ID: GAME-MELODIQ-REMOTE-COMMANDS]: `parseRemoteCommand` accepts `{ type: 'remote.command', from, command, value?, to? }` with `command` one of `REMOTE_COMMANDS` (`play`, `pause`, `toggle`, `next`, `restart`, `exit`, `UPDATE_PROFILE`, `session.join_mode`, `CALIBRATE_PLAY_BEEP`, `CALIBRATE_BEEP`, `PING`, `PONG`); unknown commands and a missing `from` are rejected. Extra fields travel in `value` (`{ latency }`, `{ mode }`); `profileLatencyOf` / `joinModeOf` read them.
- Phone: `hooks/usePhoneRemoteCommands.ts` (used by `sendClientCommand` of `PhoneClientEngine.tsx`, which ignores names outside the list) publishes on the room events channel (`gameKey: 'melodiq'`). It goes to the host only.
- Host: `hooks/useHostRemoteCommands.ts` (mounted by `useMelodiqGlobalEvents`) runs `handleRemoteCommandEvent`: `PING` is answered with a `PONG` whose `to` is the pinging phone; `CALIBRATE_BEEP` plays the beep; everything else goes to the TV window via `sendRemoteCommand`, or to `melodiq_host_command` without a TV (`useHostPlaybackCommands`). `usePeerSessionMessages.ts` subscribes to the same events during a session for `UPDATE_PROFILE`, `restart`, `next`, `exit` and `session.join_mode`; it finds the phone's player by `from` (`deviceId`, else peer id). Both handlers run on the host only (`manager` is null on a phone).
- No role check: every phone could send every command before, and still can (`exit` and `restart` included). **Unverified:** whether any phone UI should be limited by `getRoleForDevice`.
- Dead ends kept as they were: no phone sends `PING` or consumes `PONG` today, and `CALIBRATE_PLAY_BEEP` (sent by `RemoteLatencyCalibrator`) is forwarded to the TV, which has no handler for it. The connection-layer ping (`pongFor` in `useWebRTCClient`) is unrelated and unchanged.

### 2.16 Room protocol at a glance (#813)

All phone-to-host traffic except the direct messages below runs on the room API over the WebRTC star: `peerTransport.ts` (`createHostPeerTransport` / `createClientPeerTransport`, envelope `{ type: 'room', channel, msg }`), wired by `hooks/useMelodiqRoomTransport.ts` (§2.8). The host stamps `from` with the sender's `deviceId ?? peerId`, a `to` event reaches only that peer, phones never see each other's messages. `roomId` is the party id.

| Channel (`gameKey`)                       | Event / state                                                                                             | Direction                | `to` | Section |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------ | ---- | ------- |
| `melodiq_<room>_live` (`melodiq`)         | `feedback.submit`                                                                                         | phone to host            | no   | 2.8     |
|                                           | `feedback.result`                                                                                         | host to one phone        | yes  | 2.8     |
|                                           | `settings.get`, `settings.set` (admin only)                                                               | phone to host            | no   | 2.7     |
|                                           | `settings.state`                                                                                          | host to one phone        | yes  | 2.7     |
|                                           | `queue.add`, `queue.select_song`, `queue.remove`, `queue.reorder_participant`, `queue.toggle_participant` | phone to host            | no   | 2.13    |
|                                           | `library.search`                                                                                          | phone to host            | no   | 2.14    |
|                                           | `library.results`                                                                                         | host to one phone        | yes  | 2.14    |
|                                           | `remote.command` (`play`, `pause`, `toggle`, `next`, `restart`, `exit`, `UPDATE_PROFILE`, ...)            | phone to host            | no   | 2.15    |
|                                           | `remote.command` with `command: 'PONG'` (answer to `PING`)                                                | host to one phone        | yes  | 2.15    |
| `melodiq-queue_<room>` (`useRoomReducer`) | state `{ queue, nowPlaying }`, action `HOST_QUEUE` (host only), hello/state handshake of `roomSync.ts`    | host state to all phones | no   | 2.13    |

Still direct WebRTC data channel messages (not room events, #813 decision 7): `identify` and the connection ping/pong, microphone audio, the song proxy (`api_request` and its replies, `useSongs.tsx`), `helper_config.get` / `helper_config` (carries the helper token, answered per peer by `PhoneQueueBridge.tsx`), and two leftovers that are not part of the room API yet: `trackSelect` (phone to host, `useHostPhoneJoin.ts`, `usePeerSessionMessages.ts`) and the `configure` handler of `useRemoteConfigListener.ts` plus the `history_report` branch of `usePeerSessionMessages.ts`, which no code in the repository sends. Same-device TV and tab sync (`useMultiChannelSync`: TV control, settings, queue between windows) is local `BroadcastChannel`, not WebRTC.

## 3. Known Technical Debt & Refactoring Goals

To ensure Melodiq aligns perfectly with the SOLID principles outlined in the main architecture doc, the following areas are targeted for future refactoring:

> [!WARNING]
> **God Component `MelodiqGame.tsx`**
> Currently, `MelodiqGame.tsx` acts as a God component. It handles the Host UI (Queue, Search, Dialogs), Phone Client injection (`clientRole === 'singer'`), and overarching state.
> **Goal**: Split into `HostEngine.tsx` and `ClientEngine.tsx` at the router level. `MelodiqGame.tsx` should solely be a router/role-selector.

> [!WARNING]
> **Mixed Responsibilities in `PlaybackManager.tsx`**
> This component renders the `MelodiqSession`, renders the `MiniPlayer`, and manages `audio` state.
> **Goal**: Extract the complex React logic into a `usePlaybackManager.ts` custom hook, leaving `PlaybackManager.tsx` as a pure Presentational Container.

## 4. Development Rules for Melodiq

1.  **Audio Sync**: Never rely on `setTimeout` or `setInterval` for lyrics/pitch synchronization. Always use `audioRef.current.currentTime` as the single source of truth; a second decoder or another device follows it through `mediaDrift.ts` / `remoteClock.ts` (§2.9), never with thresholds of its own.
2.  **State Sync**: When adding a new piece of state (e.g., a new game setting), ensure it is propagated to the TV via `usePassiveSync.ts` and the `GAME_STATE` payload.
3.  **Strict File Boundaries**: UI Components must not make direct database calls (`db.ts`). Database fetching should happen in Container Components or custom hooks.
