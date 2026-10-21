---
type: Reference
title: 'Data persistence layer'
description: "Where LocalGameGalaxy stores data: the storage.ts key/value service (API, memory fallback, STORAGE_KEYS groups, prefixes, sessionStorageSafe), the six IndexedDB databases with their stores and access technique, and the companion server's files (config.json, playlists.json, song folders, models)."
tags: [persistence, storage, indexeddb, dexie, localstorage, server]
status: stable
generated:
  at: 2026-10-18T15:00:00+02:00
  by: claude-code
verified:
  at: 2026-10-18
  method: 'read src/lib/storage.ts, all db.ts / tabletopStorage.ts files, server/src/config.ts, server/src/plugins/melodiq/services/{scanner,playlists,download,separator}.ts'
sources:
  - 'src/lib/storage.ts'
  - 'src/games/*/logic/db.ts, src/games/melodiq/db.ts, src/games/tabletop/logic/tabletopStorage.ts'
  - 'server/src/config.ts'
---

# Data persistence layer

Update this document whenever you add a storage key, an IndexedDB database/store/version, or a server-side file.

## 1. Key/value: `src/lib/storage.ts`

The only file allowed to touch `localStorage` / `sessionStorage` (enforced by `npm run check:architecture`).

| API                                                         | Notes                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage.get(key, fallback = '')`, `set`, `remove`, `clear` | strings; every call is wrapped in `try/catch` and mirrored into an in-memory `Map` so private mode / blocked storage still works for the session                                                                                                                                                                                 |
| `storage.getJson<T>(key, fallback)`, `setJson`              | JSON helpers; parse errors return `fallback`                                                                                                                                                                                                                                                                                     |
| `storage.findKeysWithPrefix(prefix)`                        | used for per-game prefixed keys                                                                                                                                                                                                                                                                                                  |
| `storage.session` / `sessionStorageSafe`                    | same API on `sessionStorage`                                                                                                                                                                                                                                                                                                     |
| Typed accessors                                             | `getHelperUrl` (default `http://localhost:3000`), `getHelperToken`, `isHelperActive`, `getSignalingUrl` (derives `ws(s)://<helper-host>:8000`), `get/setDisabledTrackerUrls(gameId)`, `getPushRelayUrl`, `getNotificationMethod`, `getNtfyServerUrl` (default `https://ntfy.sh`), `getUserNtfyTopic` / `regenerateUserNtfyTopic` |

### `STORAGE_KEYS` groups (91 keys)

| Group                   | Examples (value in parentheses)                                                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Companion helper        | `HELPER_URL` (`melodiq_helper_url`), `HELPER_TOKEN`, `HELPER_ACTIVE`, `SIGNALING_URL` (`galaxy_signaling_url`), `WEBRTC_STUN_CUSTOM_URLS`, `WEBRTC_STUN_PREFERENCES` ([webrtc-signaling §6](webrtc-signaling.md#6-ice--stun-servers)) |
| Melodiq client/session  | `CLIENT_PROFILE`, `PROFILES`, `ACTIVE_SESSION`, `CURRENT_SONG_PARTICIPANTS`, `MELODIQ_TRACKER_*`, `MELODIQ_MIC_*`, `MELODIQ_PARTY_ID`, `MELODIQ_HOST_BASE_URL`                                                                        |
| Melodiq queue           | `NOW_PLAYING`, `QUEUE`, `SONG_HISTORY`                                                                                                                                                                                                |
| Melodiq legacy profiles | `MELODIQ_P1_*`, `MELODIQ_P2_*` (migration only)                                                                                                                                                                                       |
| Melodiq settings        | `MELODIQ_SHOW_*`, `MELODIQ_*_VOLUME`, `MELODIQ_LYRICS_*`, `MELODIQ_AUDIO_PLAYBACK_MODE`, `MELODIQ_MIC_LATENCY`, …                                                                                                                     |
| Melodiq Notes           | `MELODIQ_NOTES_SOUND_CONFIG`, `_VIEW_MODE`, `_SHEET_RENDER_MODE`                                                                                                                                                                      |
| Werewolf                | `WEREWOLF_STATE` (`werewolf-game-state`), `WEREWOLF_SETUP_PLAYERS`, `WEREWOLF_CUSTOM_ROLES` (`werewolf-custom-roles`), `WEREWOLF_SETTINGS`, `WEREWOLF_TTS_ENABLED`                                                                    |
| Imposter                | `IMPOSTER_SETTINGS`, `IMPOSTER_SETUP_PLAYERS`, `IMPOSTER_SEEN_INFO`                                                                                                                                                                   |
| GitHub publishing       | `GITHUB_TOKEN` (`nexumia_github_token`, a PAT — see `src/lib/github.ts` security note), `GITHUB_OWNER`, `GITHUB_REPO`                                                                                                                 |
| Notifications           | `PUSH_RELAY_URL`, `NOTIFICATION_METHOD`, `NTFY_SERVER_URL`, `NTFY_TOPIC`                                                                                                                                                              |
| Small games             | `DARTS_GAME_STATE`, `SUDOKU_STATE`, `SUDOKU_STATS`, `WORDLE_STATS`, `CARDS_LOBBY_PLAYERS`, `KNISTER_*`, `QWIXX_*`                                                                                                                     |
| Party / Gartic          | `GARTIC_STATE_PREFIX`, `GARTIC_HOST_PREFIX`, `PARTY_MY_PLAYER_ID`, `HOST_ROOM_CODE`, `PARTY_PLAYER_NAME` (`guessart_player_name`, shared by party lobby and Gartic Phone; `features/party/logic/playerName.ts`)                       |
| App                     | `SHARE_WEBAPP_URL`, `PWA_BANNER_DISMISSED`, `LANGUAGE` (`lgg_language`), `LANGUAGE_LEGACY` (`language`), `EXCALIDRAW_LIBRARY`, `EXCALIDRAW_DRAWING`                                                                                   |

Read the file for the full list — this table is a map, not a copy.

`STORAGE_PREFIXES`: `PARTY_STATE` (`galaxy_party_state_`), `PARTY_HOST_ID`, `GAME_RELAY` (`galaxy_game_relay_`), and the per-game WebRTC suffixes `WEBRTC_PARTY_ID`, `WEBRTC_TRACKER_URLS`, `WEBRTC_TRACKER_PREF`, `WEBRTC_ACTIVE_PEERS`, `HOST_BASE_URL`, `ENABLE_HELPER` (used as `` `${gameId}${suffix}` ``).

**Known drift:** several games keep key strings in local constants and some registered keys are unused — [open-questions Q8](../open-questions.md#q8--game-local-storage-keys-bypass-the-storage_keys-registry), per-game list in [game-catalog §2](game-catalog.md#2-persistence).

## 2. IndexedDB databases

| Database             | Access                           | Version  | Stores (key path / indexes)                                                                                                                                                                           | Code                                          |
| -------------------- | -------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `MelodiqDB`          | Dexie                            | 11       | `scores` (`++id, songId, profileId, score, date, difficulty`), `playlists` (`id, name, creatorToken, isGlobal, updatedAt`), `folderHandles` (`id, name, updatedAt` — File System Access handles, v11) | `src/games/melodiq/db.ts`                     |
| `MelodiqNotesDB`     | Dexie                            | 1        | `songs` (`id, title, artist, folderId, addedAt` — MusicXML, stems, sync offset), `folders` (`id, name, updatedAt`)                                                                                    | `src/games/melodiq-notes/logic/db.ts`         |
| `ImposterDB`         | Dexie (subclass)                 | 1        | `imposter_categories` (`id`), `imposter_word_pairs` (`++id, *categoryIds`)                                                                                                                            | `src/games/imposter/logic/db.ts`              |
| `guessart-local`     | raw IDB via `modules/async-game` | see file | `games` (`id`), `rounds` (`id`), `catalogues` (`language`), `metadata` (`key`)                                                                                                                        | `src/games/guessart/logic/db.ts`              |
| `storyteller-local`  | raw IDB via `modules/async-game` | see file | `games` (`id`), `entries` (`id`)                                                                                                                                                                      | `src/games/storyteller/logic/db.ts`           |
| `galaxy_tabletop_db` | raw IDB + `runWithStore`         | see file | `custom_games` (`id`), `sessions` (`key`, v3: running game autosaved by host/local play, key `room:<roomId>:<gameId>` or `local:<gameId>`)                                                            | `src/games/tabletop/logic/tabletopStorage.ts` |

Rules:

- Dexie: add a new `db.version(n+1).stores({...})` block; never edit an old version's schema. `MelodiqDB` declares only v10 and v11 — browsers with an older version upgrade through them.
- Raw IDB: use `createOpenDatabase` / `createIdbStoreOperations` / `runWithStore` from `src/modules/async-game`; create stores in the upgrade handler guarded by `objectStoreNames.contains`.
- Deleting a database during development: browser DevTools → Application → IndexedDB.

## 3. Companion server files

| What              | Where                                                                                                                                                                                                                                                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config.json`     | `CONFIG_PATH` if that file exists, else the first `config.json` in: dir of `CONFIG_PATH`, `/app/config`, current working directory, directory of the executable, its parent (`server/src/config.ts`). Created/updated by the server (token auto-generated). Example: `server/config.example.json`. Git-ignored.                           |
| Env overrides     | `PORT`, `SECURITY_TOKEN` / `TOKEN`, `MUSIC_DIR` / `DIRECTORIES` (comma lists), `TABLETOP_DIR`, `MODELS_DIR`. Applied at runtime only, never saved to `config.json`; file values identical to an env value are dropped at start (`server/src/core/configSources.ts`)                                                                       |
| `playlists.json`  | next to `config.json` / explicit config dir; `/app/config/playlists.json` in Docker; else cwd (`services/playlists.ts`)                                                                                                                                                                                                                   |
| Song library      | any folder below the configured `directories`; every UltraStar `*.txt` is a song. Media next to it: audio, optional video and cover, separated stems recognised by `vocals` / `instrumental` in `.mp3` names (`services/scanner.ts`). Downloads go to `downloadDir` or the first directory, one folder per song (`services/download.ts`). |
| Separation models | `MODELS_DIR` or `<cwd>/models` (`UVR-MDX-NET-Inst_HQ_3.onnx`; tracked in git, see [Q11](../open-questions.md#q11--637-mb-onnx-model-tracked-in-git))                                                                                                                                                                                      |
| Tabletop assets   | `tabletopDirectories` / `TABLETOP_DIR`                                                                                                                                                                                                                                                                                                    |

The server stores no player data. Song media and stems must never be committed (`server/music/` is git-ignored).
