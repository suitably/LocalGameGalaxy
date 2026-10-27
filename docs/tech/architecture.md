---
type: Reference
title: 'System architecture (SSoT)'
description: "Single source of truth for LocalGameGalaxy's architecture: stack, folder layout and boundaries, game modules (summary — details in game-catalog), shared modules, layout contexts, persistence, notifications, the optional Hono companion server and the signaling tracker."
tags: [architecture, ssot, react, vite, hono, webrtc, mqtt, pwa, capacitor]
status: stable
generated:
  at: 2026-10-18T15:00:00+02:00
  by: claude-code
verified:
  at: 2026-10-26
  method: 'read against src/lib/gameRegistry.tsx, src/modules/*, src/context/*, src/lib/storage.ts, server/src/{index,config}.ts, server/src/core/*, server/src/plugins/*, signaling/src/index.js'
sources:
  - 'src/lib/gameRegistry.tsx'
  - 'src/modules/'
  - 'server/src/'
  - 'merged from: previous version of 2026-09-27'
---

# System architecture

> This document is the **single source of truth** for the project's technical architecture. Agents: update it in the same PR whenever you change structure, boundaries, shared modules or the server plugin set (the doc-sync gate in `npm run check:docs` enforces _some_ doc update for core changes).

## 1. Overview

**LocalGameGalaxy** (`suitably/LocalGameGalaxy`, product name **Nexumia**) is an offline-first PWA that hosts local group games. Phones act as controllers, a TV/laptop as shared screen. Everything runs client-side; a companion server is optional and only needed for the Melodiq song library, stem separation, tabletop asset folders and an HTTP room relay.

| Concern     | Choice                                                                                                                                                          |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime     | React 19 SPA, TypeScript (strict; `any` is a lint _warning_ held by a per-file ratchet, see [coding-conventions](coding-conventions.md#eslint-warning-budget))  |
| Build       | Vite 7, `vite-plugin-pwa`, Node ≥ 24 (`.nvmrc`)                                                                                                                 |
| UI          | MUI 7 (`src/theme.ts`)                                                                                                                                          |
| State       | React state / `useReducer` / context; layout split into segregated contexts (§3.4)                                                                              |
| Persistence | `src/lib/storage.ts` (`STORAGE_KEYS`, memory fallback), IndexedDB via Dexie 4 or raw IDB helpers ([persistence](persistence.md))                                |
| Mobile      | Capacitor 8, Android only (`android/`, appId `com.localgamegalaxy.melodiq`)                                                                                     |
| i18n        | i18next, `de` + `en` ([i18n-strategy](i18n-strategy.md))                                                                                                        |
| Sync        | public WSS MQTT (`MqttMailboxService`), `BroadcastChannel`, WebRTC via `simple-peer` + WebTorrent trackers, Web Push / ntfy ([sync-protocol](sync-protocol.md)) |
| Hosting     | Cloudflare Workers static assets (`wrangler.jsonc`, deployed by `ci.yml`)                                                                                       |

## 2. Repository layout

```
src/
├── App.tsx, main.tsx, i18n.ts, theme.ts
├── assets/
├── components/      # app-wide UI: common/ (ConfirmDialog…), connection/, feedback/, games/ (Die3D), Layout/ (GlobalHeader), push/, pwa/
├── context/         # TitleContext, HeaderLayoutContext, SettingsModeContext, GameSettingsContext, LayoutContext (composite adapter)
├── features/        # hub/, party/ (Universal Party lobby), settings/
├── games/           # 15 game folders — one self-contained domain each (see game-catalog)
├── hooks/           # useWakeLock, useScreenOrientation, usePWAInstall, useServerUrlAutoConnect, usePrefersReducedMotion
├── lib/             # storage.ts, gameRegistry.tsx, github.ts, companion/, push/, notifications/, webrtc/, utils/, uuid.ts, disambiguateName.ts
├── modules/         # shared cross-game modules (§3.2)
└── types/
server/              # optional companion server (separate npm package, Hono)
├── src/index.ts     # Node entry; src/worker.ts = Workers entry
├── src/core/        # app.ts (CORS, PNA, /health, /api/info), pluginLoader.ts, tunnel.ts, types.ts
├── src/plugins/     # melodiq/, notes/, relay/, tabletop/
└── cloudflare-push-relay/   # separate Cloudflare Worker for Web Push + ntfy fan-out
signaling/           # standalone BitTorrent WebSocket tracker (port 8000)
scripts/             # quality gates (check-*.mjs/js), scaffold-game.mjs, pipeline/
public/locales/      # de/en translation.json
android/             # Capacitor Android project
```

## 3. Core concepts

### 3.1 Game modules (`src/games/*`)

Each game is self-contained: entry component, internal state (reducer, hook or state machine), `logic/` with pure functions and tests. Games are registered by hand in `src/lib/gameRegistry.tsx` (lazy import, route, category, i18n keys; the hub colours games by area, see `src/lib/areas.ts`). **Cross-game imports are forbidden** (`npm run check:architecture`).

The full per-game table (route, size, storage, sync, i18n source, shared modules, tests) is in **[game-catalog.md](game-catalog.md)**. Short characterisation:

| Game                               | What it is                                                                                                                              | Notable internals                                                                                                                                                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Darts                              | X01 / count-up score tracker                                                                                                            | logic in `useDartsGame.ts`; state in `STORAGE_KEYS.DARTS_GAME_STATE`                                                                                                                                                      |
| Qwixx                              | roll-and-write with variants                                                                                                            | `sheetDefinitions.ts`, `diceHighlight.ts`, `qwixxReducer.ts`; rules in [qwixx-sheet-rules](qwixx-sheet-rules.md)                                                                                                          |
| Knister                            | 5×5 dice bingo, poker-like line scoring                                                                                                 | reducer + highscore                                                                                                                                                                                                       |
| Kniffel                            | classic 5-dice game                                                                                                                     | reuses `components/games/Die3D`                                                                                                                                                                                           |
| GuessArt                           | pass-and-play / async drawing & guessing                                                                                                | Excalidraw via `modules/drawing`; fuzzy guess evaluation (`guessEvaluator`, `lingo`); catalogue editor with GitHub PR publishing (`lib/github.ts` → `createGitHubPR`); cross-language rounds; MQTT `lgg/ga`               |
| Storyteller (Geschichtenschreiber) | collaborative async story                                                                                                               | modifiers (blind mode, time attack, word roulette); `useMultiChannelSync` + MQTT `lgg/storyteller/v1`; Web Push / ntfy turn notifications                                                                                 |
| Cards                              | score sheets: Schwimmen (31), Oh Hell, universal                                                                                        | views per game                                                                                                                                                                                                            |
| Melodiq                            | UltraStar karaoke: host, TV, phone clients                                                                                              | WebRTC phone mics, Presentation API / `BroadcastChannel` TV mode, local files or companion library, YouTube background via IFrame API (`gameplay/youtubeApi.ts`); details [melodiq-architecture](melodiq-architecture.md) |
| Melodiq Notes                      | sheet-music practice (OSMD)                                                                                                             | multi-stem player `hooks/useStemAudioPlayer.ts`, MIDI input, `MelodiqNotesDB`                                                                                                                                             |
| Werewolf                           | moderator for _Werwölfe von Düsterwald_                                                                                                 | role/night engine, TTS narrator; [werewolf-architecture](werewolf-architecture.md)                                                                                                                                        |
| Imposter                           | pass-the-device word deduction                                                                                                          | phases `LOBBY → HANDOVER → TIMER → VOTING → RESULT`; `ImposterDB` for categories/word pairs                                                                                                                               |
| Wordle                             | daily 5-letter puzzle de/en; guesses validated against target + allowed lists (`logic/dictionary.ts`, setting `WORDLE_DICTIONARY_ONLY`) | `useWordleHistory`, streak stats                                                                                                                                                                                          |
| Sudoku                             | daily / freeplay generator + solver                                                                                                     | notes, conflicts, hints, stats                                                                                                                                                                                            |
| Tabletop                           | PlayingCards.io (`.pcio`/`.json`) and Tabletop Simulator workshop import engine                                                         | TV surface + phone controller, `fflate` unzip, `galaxy_tabletop_db`, MQTT `lgg/tabletop`, GitHub PR publishing                                                                                                            |
| Party lobby (`src/features/party`) | Jackbox-style room (`#/party?room=XYZ`)                                                                                                 | MQTT `lgg/party`; launches Gartic Phone or tabletop games for all devices                                                                                                                                                 |
| Gartic Phone                       | drawing telephone, party-only                                                                                                           | `useGarticGameState` + `useGarticSync` (`useMultiChannelSync`); `GarticPhoneGame.tsx` 170 lines                                                                                                                           |

### 3.2 Shared modules (`src/modules/*`)

| Module              | Provides                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Used by                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `player-management` | `PlayerManagerCard`, `useLobbyPlayers`, `playerLogic.ts` (min/max, duplicates, trimming; players may be removed down to 0); player seats for async games: `playerSeats.ts`, `seatActions.ts`, `createSeatedAssignment`, `useSeatUpkeep`, `PlayerJoinedSnackbar`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | cards, guessart, imposter, storyteller, werewolf    |
| `pass-and-play`     | `handover.ts` (`nextPlayerId`, `handoverReducer`), `usePassAndPlay`, `HandoverCover` (opaque cover until the next player reveals), `SwitchPlayerButton`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | tabletop (local)                                    |
| `room-game`         | `roomSync.ts` (`hostApply`, `guestAccept`), `useRoomReducer` — the host runs a game's pure reducer, guests send actions and render the host's state (channel `<game>_<room>`); `useRoomEvents` — fire-and-forget live events beside it (channel `<game>_<room>_live`); both over `roomTransport.ts` (BroadcastChannel + MQTT `lgg/room`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | knister (party room), melodiq-notes (stage ↔ pult)  |
| `sync`              | `MqttMailboxService<T>` (brokers HiveMQ → EMQX, LZString, dedup), `useMultiChannelSync<T>` / `MultiChannelSyncCoordinator` (BroadcastChannel + MQTT)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | guessart, storyteller, tabletop, garticphone, party |
| `drawing`           | `DrawingCanvas`, `ExcalidrawLazy`, `ExcalidrawViewer` (stroke replay), `excalidrawScene.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | guessart, garticphone                               |
| `sharing`           | `ShareSessionLinksDialog`, `EditSessionDialog`, `parseGameUrlParams`, `cleanWindowUrlQuery`, `useGameJoinUrl`, `useShareOrCopy`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | guessart, storyteller, wordle, garticphone, sudoku  |
| `async-game`        | `createIdbStoreOperations`, `runWithStore`, `createOpenDatabase` (raw IndexedDB helpers)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | guessart, storyteller, tabletop                     |
| `audio`             | `MicrophoneManager`, `AudioUtils` (autocorrelation pitch, RMS gate, MIDI mapping), `latency/` (beep calibration: `useLatencyCalibration`, `LatencyCalibratorPanel`, `detectBeep`, `playCalibrationBeep`; tap-along calibration: `tapAlongLatency`, `useTapAlong`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | melodiq, melodiq-notes                              |
| `music-score`       | `parseMusicXml` / `extractMxl` / `parseMidi` / `parseUltraStarTxt` + `ultraStarToScore` (UltraStar `.txt` → vocal parts and bar marks from `#BPM`/`#GAP`, #566) (one shared timeline: repeats written out, tempo map, parts with instrument guess), `assignTab`, `alignRecording` (bar marks for a recording: tuning estimate and semitone-shift search, chroma + onset DTW with a steady-tempo step penalty that may skip a score intro/outro missing from the recording, then a whole-song fit of note attacks to band and pitch-class onsets, `fitMarksToNotes` / `chromaOnsets`; drums-only scores take an onset path instead of the DTW, `marksFromOnsets`; dev check on real files: `scripts/align-eval.mjs`), `pinBar` / `nearestBar` (move one bar mark by hand, neighbours follow), `createAudioMap`, `applyBarMarksToMusicXml` | melodiq-notes, melodiq                              |

Other shared building blocks outside `src/modules/` (check these before writing a new one — this is the reuse catalog [AGENTS.md](../../AGENTS.md) points to):

| Building block           | Path                                                                            | Provides                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Confirm dialog           | `src/components/common/ConfirmDialog.tsx`                                       | MUI confirmation modal (replaces `confirm()`)                                                                                                |
| List states              | `src/components/common/{EmptyState,ErrorState,ListSkeleton}.tsx`                | Empty / error (+retry) / loading placeholder for lists and lobbies (DESIGN.md §6); no shimmer                                                |
| Game header bar          | `src/components/common/GameHeaderBar.tsx`                                       | Flat AppBar + toolbar shell for in-game top bars (GuessArt, Storyteller)                                                                     |
| 3D dice                  | `src/components/games/Die3D.tsx`, `useDiceRollAnimation.ts`                     | animated die; roll delay before values are revealed                                                                                          |
| Header & titles          | `src/context/TitleContext.tsx`, `src/context/HeaderLayoutContext.tsx`           | `usePageTitle`, `useHeaderLayout` — actions, menu items, safe hub exit (§3.4)                                                                |
| Settings UI kit          | `src/components/settings/`                                                      | `SettingsSection`, `SettingRow`, `SettingSwitch` / `SettingSlider` / `SettingToggleGroup`, `SettingsResetButton`, `GameSettingsSheet` (§3.8) |
| Stored settings          | `src/hooks/useStoredSettings.ts`                                                | typed settings object in `storage` with defaults, `update`, `reset`                                                                          |
| Push                     | `src/components/push/`, `src/lib/push/pushClient.ts`                            | permission banner, settings, Web Push / ntfy client (§3.3)                                                                                   |
| Storage                  | `src/lib/storage.ts`                                                            | key/value storage with memory fallback, `STORAGE_KEYS` (§3.5)                                                                                |
| Design tokens, hub areas | `src/themeTokens.ts`, `src/lib/areas.ts`, `src/components/brand/AreaSymbol.tsx` | colour/type tokens behind `src/theme.ts` (`theme.palette.piece`), category → area mapping, area symbols ([DESIGN.md](../../DESIGN.md) §8)    |
| Wake lock, orientation   | `src/hooks/useWakeLock.ts`, `src/hooks/useScreenOrientation.ts`                 | keep screen on, lock orientation                                                                                                             |
| GitHub publishing        | `src/lib/github.ts`                                                             | `createGitHubPR` (REST via `fetch`)                                                                                                          |
| WebRTC                   | `src/lib/webrtc/`                                                               | `WebRTCHostManager`, `useWebRTCClient`, `WebRTCHostContext`, `trackerLogic.ts`                                                               |

### 3.3 Notifications (Web Push + ntfy)

- Client: `src/lib/push/pushClient.ts`, `pushTypes.ts`, `gameRelayStorage.ts`; UI `src/components/push/` (`PushNotificationBanner`, `NotificationSettings`, `CloudflareWorkerGuideAccordion`).
- Channel preference `auto | webpush | ntfy | both` (`storage.getNotificationMethod()`); ntfy server default `https://ntfy.sh`, per-user topic generated by `generateUserNtfyTopic()`.
- Relay: Cloudflare Worker in `server/cloudflare-push-relay/` (`worker.ts`, `webpush.ts`, `wrangler.toml`), deployed by `deploy-push-relay.yml`. **Unverified:** KV binding and in-memory fallback details — read `worker.ts` before changing them.
- Service worker `public/sw-push.js` handles push events and opens the game on click.

### 3.4 Layout contexts

UI layout state is split to avoid app-wide re-renders (`src/context/`):

- `TitleContext` — `usePageTitle`, `useTitle`.
- `HeaderLayoutContext` — header visibility, custom title/actions, menu items, home action (`useHeaderLayout`).
- `SettingsModeContext` — `isSettingsMode` (`useSettingsMode`); kept for `LayoutContext.setHeader`, no reader left (`GlobalHeader` detects settings pages by pathname).
- `GameSettingsContext` — `useGameSettings()` (`openGameSettings`, `closeGameSettings`), `useGameSettingsHost({ audience, onClose })` for the active game (§3.8).
- `LayoutContext` — backward-compatible composite (`useLayout`, `useLayoutContext`, `useHeader`). New code should use the specific context.

### 3.5 Persistence

- Key/value: `storage.get/set/remove/getJson/setJson` and `sessionStorageSafe` from `src/lib/storage.ts`, keys in `STORAGE_KEYS` / `STORAGE_PREFIXES`. Raw `localStorage.` / `sessionStorage.` outside that file fails `check:architecture`.
- IndexedDB: `MelodiqDB`, `MelodiqNotesDB`, `ImposterDB` (Dexie); `guessart-local`, `storyteller-local`, `galaxy_tabletop_db` (raw IDB via `modules/async-game`).
- Full schema and key list: [persistence.md](persistence.md).

### 3.6 Companion server (`server/`, optional)

- **Hono** on `@hono/node-server` (`server/src/index.ts`); a Workers entry exists in `server/src/worker.ts`.
- Plugins loaded from env `PLUGINS` (default `relay,melodiq,tabletop,notes`):
  - `melodiq` — song scan of configured directories, HTTP 206 media streaming (`/media`), USDB search/download jobs, `yt-dlp`, stem separation and lyric alignment jobs, playlists, config/API-key management. Auth middleware `core/auth.ts` (`requireAuth`, `requireMasterToken`, `getRequestToken`).
  - `relay` — in-memory HTTP room relay (`/api/relay/rooms/*`, rooms expire after 4 h idle). It is **not** the WebRTC tracker.
  - `tabletop` — tabletop asset folders, game listing, workshop import, image proxy; `POST/PUT/DELETE /api/tabletop/games[/:id]` save games from the client to `<first tabletop dir>/saved/<name>/game.json` (only those are writable; listing entries carry `saved`). `/api/tabletop/saves` stores named table states and `PUT/DELETE /api/tabletop/games/:id/template` a game's default template, both in the hidden `<save root>/.states/` folder (`services/saveStore.ts`; API key permissions `allowTabletopSaves` / `allowTabletopTemplates`). All routes require a token.
  - `notes` — Melodiq Notes library in `NOTES_DIR` (default data folder `notes`), the only sheet-music store: one folder per piece with `piece.json` (optional `songId`: plays with that Melodiq song's mix), scores (MusicXML/MIDI), recordings and `<score>.marks.json`; `/api/notes/pieces*` and `/notes/media/:id/:file` (range streaming). The melodiq plugin imports song-folder scores into linked pieces once on startup and answers its deprecated `/api/songs/:id/scores` routes from them ([song-pipeline §4](song-pipeline.md#4-sheet-music-for-melodiq-notes)). Client: `src/lib/companion/notesLibraryApi.ts`; Melodiq Notes saves the song on stage (score, local recording, bar marks) via `stage/logic/notesLibrarySync.ts`; the song picker's "Notes library" tab lists these pieces (`stage/logic/scoreCatalog.ts`).
- Core: CORS + Private Network Access header + `/health` + `/api/info` (`core/app.ts`); optional Cloudflare Quick Tunnel (`core/tunnel.ts`, `ENABLE_TUNNEL=true` or `--tunnel`).
- Config: `config.json` found via `CONFIG_PATH`, `/app/config`, cwd or next to the executable; env overrides `PORT`, `SECURITY_TOKEN`/`TOKEN`, `MUSIC_DIR`, `DIRECTORIES`, `TABLETOP_DIR`, `NOTES_DIR`, `MODELS_DIR`, `ALLOWED_ORIGINS`. Existing data folders `/app/{music,tabletop}` (Docker) or `<cwd>/{music,tabletop}` (binaries) are picked up automatically; `notes` and the tabletop save folder fall back to the same places. Token auto-generated if empty. Details: [server-security](server-security.md), [secrets-management](secrets-management.md).
- Plain HTTP only; TLS comes from the tunnel or a reverse proxy.

### 3.7 Signaling tracker (`signaling/`)

Standalone `bittorrent-tracker` server, `PORT`/`TRACKER_PORT` (default 8000), `/health`. `npm run tracker` starts it via `scripts/start-tracker.js`. Clients derive its URL from the helper URL (`storage.getSignalingUrl()` → `ws(s)://<helper-host>:8000`) or use public WebTorrent trackers. Details: [webrtc-signaling](webrtc-signaling.md), [operations/webrtc-tracker](../operations/webrtc-tracker.md).

### 3.8 Settings: app scope vs. game scope

Decisions and rationale: [settings unification plan](../reports/2026-10-26-settings-unification-plan.md).

- **App settings** — `/settings` (`src/features/settings/Settings.tsx`), master–detail: rail ≥ `md`, list page → detail page below. Sections in fixed order: `general` (language, appearance), `audio` (`AudioInputSettings` from `src/modules/audio`), `connectivity` (pairing, signaling, companion plugins, server setup), `notifications`, `integrations` (GitHub PAT), then **Games**, then `about` (feedback).
- **Routes** — `settingsPath(target)` / `parseSettingsLocation()` in `src/features/settings/settingsRoutes.ts`: `/settings/:section`, `/settings/games/:gameId[/:section]`, `?highlight=<id>` scrolls to `settings-section-<id>`. Build links only with `settingsPath`. The only legacy query honoured is `pair` + `code` (pairing links of older companion servers); `server/src/core/pairing.ts` prints `/settings/connectivity?pair=…&code=…`.
- **Game settings** — declared per game in `src/lib/gameSettingsRegistry.tsx` (`GameDefinition.settings.sections`: `id`, `titleKey`, `icon`, lazy `component`, `audience` `all | host | client`). Section components live in `src/games/<id>/settings/` and are self-contained. The same sections render on `/settings/games/<id>` (host/all) and in the in-game `GameSettingsSheet`, which the header gear opens on a game route with settings; elsewhere the gear opens `/settings`. Games never add their own settings gear or dialog.
- **Round options** (players, mode of the running game) stay in the game's setup UI, e.g. Darts `DartsGameSetupDialog`.

## 4. Component design rules

The rules (SRP, 250-line budget with ratchet, 3-tier decomposition, anti-pattern matrix) live in **[coding-conventions.md](coding-conventions.md)** and are summarised in [AGENTS.md](../../AGENTS.md). Not repeated here — one topic, one home.

Known deviations from the rules are tracked in [open-questions.md](../open-questions.md) (Q4 Melodiq `BroadcastChannel`, Q8 unregistered storage keys).

## 5. Verification & quality gates

Gates run in Husky hooks, GitHub Actions (`ci.yml`) and the GitLab mirror (`npm run ci:gates`). Overview: [workflows/ci-cd-pipelines.md](../workflows/ci-cd-pipelines.md); tool rationale: [pipeline-quality-gates.md](pipeline-quality-gates.md).

```bash
npm run check:architecture:diff # boundaries on changed files
npm run check:budget            # 250-line budget + legacy ratchet
npm run check:duplicates        # jscpd, threshold 2.5 %, minLines 12
npm run check:docs              # doc-sync gate (needs a git base ref)
npm run lint                    # ESLint, 0 errors
npm run check:security          # npm audit --omit=dev --audit-level=high
npm test                        # Vitest
npm run build                   # tsc -b && vite build
```
