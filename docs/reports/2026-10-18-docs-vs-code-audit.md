---
type: Report
title: '2026-10-18 docs-vs-code audit and OKF restructuring'
description: 'Full audit of docs/, AGENTS.md, README and CONTRIBUTING against the code: 149 broken references in 49 of 104 files, invented APIs and message types, wrong database names, a broken release job; what was corrected, moved or archived, and what stayed open.'
tags: [audit, documentation, okf, drift]
status: stable
generated:
  at: 2026-10-18T15:00:00+02:00
  by: claude-code
verified:
  at: 2026-10-18
  method: 'scripted reference check (paths, markdown links, npm scripts, backticked identifiers vs code corpus) + manual reading of every tech/workflow/operations doc against the source'
sources:
  - 'branch docs/okf-knowledge-base, base consolidated/quality-sprint-october @ c298e79 (21 commits ahead of origin/main)'
  - 'gh issue list / gh pr list for suitably/LocalGameGalaxy (2026-10-18)'
---

# Docs-vs-code audit (2026-10-18)

Snapshot report. Not updated later except for corrections. Living docs carry the fixes; unresolved items went to [open-questions.md](../open-questions.md).

## 1. Method

1. **Reference check (scripted):** every `` `path/like/this` ``, every relative markdown link and every `npm run <script>` in `docs/**`, `AGENTS.md`, `README.md`, `CONTRIBUTING.md`, `server/README.md`, `signaling/README.md`, `scripts/README.md` was resolved against the repo.
2. **Identifier check (scripted):** every backticked identifier (component, hook, function, constant) in tech/operations/workflows/ADR docs was searched in `src/`, `server/src`, `signaling/src`, `scripts/`, `.github/`, `public/`.
3. **Manual review:** each tech/workflow/operations doc read and its claims checked against code (registry, storage, Dexie schemas, MQTT topics, WebRTC messages, server routes/config, CI workflows, husky hooks, Dockerfile, Capacitor config).
4. **Task status:** task specs compared with GitHub issue state and with the code (does the target file / refactor exist).

## 2. Headline numbers (before the fix)

| Metric                                                                                                          | Value                                         |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Doc files checked                                                                                               | 104                                           |
| Files with broken references                                                                                    | 49                                            |
| Broken references (paths, links, npm scripts)                                                                   | 149                                           |
| Links to developer-local paths (`file:///home/…` worktree paths, `file:///home/carsten/…`, `file:///.github/…`) | 35                                            |
| Docs claiming `verified: { by: process:ci }`                                                                    | all OKF docs — no such CI verification exists |

## 3. Substantive errors found and corrected

| Doc                                                      | Claim in doc                                                                                                  | Reality in code                                                                                                                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tech/architecture.md                                     | 13 games; Darts numbered "9" at the top; two items "5"                                                        | 15 registry entries (incl. Party) + Gartic Phone via Party; see [game-catalog](../tech/game-catalog.md)                                                                                                  |
| tech/architecture.md                                     | Melodiq Notes `BottomActionBar`                                                                               | does not exist                                                                                                                                                                                           |
| tech/architecture.md                                     | Tabletop publishing "via Octokit"                                                                             | plain `fetch` to GitHub REST in `src/lib/github.ts` (`createGitHubPR`)                                                                                                                                   |
| tech/architecture.md                                     | Storyteller: `BroadcastChannel` + `mailboxService`                                                            | `useMultiChannelSync` + `MqttMailboxService`                                                                                                                                                             |
| tech/architecture.md                                     | Server `relay` plugin = BitTorrent tracker on WS upgrade                                                      | in-memory HTTP room relay (`/api/relay/rooms/*`); the tracker is the separate `signaling/` service                                                                                                       |
| tech/architecture.md, persistence.md                     | IndexedDB `melodiq-notes-local`; all DBs via Dexie                                                            | `MelodiqNotesDB`; also `ImposterDB`; `guessart-local`, `storyteller-local`, `galaxy_tabletop_db` are raw IndexedDB via `modules/async-game`                                                              |
| tech/architecture.md, coding-conventions, ci-cd          | "zero `any`", "blocked by CI"                                                                                 | ESLint `warn`; 219 occurrences ([Q3](../open-questions.md#q3--no-any-is-documented-as-enforced-but-is-not))                                                                                              |
| tech/persistence.md                                      | `MelodiqDB` tables `songs`, `playlists`, `playlistItems`, `songHistory`                                       | `scores`, `playlists`, `folderHandles` (Dexie v10/v11)                                                                                                                                                   |
| tech/persistence.md                                      | per-song folder `audio.mp3`, `vocals.mp3`, `lyrics.txt`                                                       | UltraStar folders with `(Instrumental)` / `(Vocals)` stems indexed by `scanner.ts`; no fixed file names                                                                                                  |
| tech/sync-protocol.md                                    | topics `localgamegalaxy/<gameId>/<sessionId>/state`                                                           | prefixes `lgg/ga`, `lgg/storyteller/v1`, `lgg/tabletop`, `lgg/party` + channel id                                                                                                                        |
| tech/sync-protocol.md                                    | envelope `{senderId, timestamp, payload}`; exponential backoff                                                | `MqttEnvelope {version, channelId, senderClientId, timestamp, payload}`; fixed 5 s reconnect + broker rotation                                                                                           |
| tech/sync-protocol.md                                    | WebRTC messages `TRACKER_SIGNAL`, `QUEUE_UPDATE`, `ADD_TO_QUEUE`, `SUNG_SEGMENT`, …                           | none exist; real vocabulary: `host_hello`, `client_probe`, `identify`, `session_sync`, `helper_config`, `api_request` / `api_response(_chunk)`, `pitch`, `PING`/`PONG`, `TV_READY`, `SETTINGS_UPDATE`, … |
| tech/sync-protocol.md                                    | `STORAGE_KEYS.MELODIQ_ACTIVE_SESSION`, `MELODIQ_SETTINGS`, `GAME_RELAY_PREFIX`                                | `ACTIVE_SESSION`; no settings key; `STORAGE_PREFIXES.GAME_RELAY`                                                                                                                                         |
| tech/sync-protocol.md                                    | push relay `server/cloudflare-push-relay/index.ts`                                                            | `worker.ts` + `webpush.ts`                                                                                                                                                                               |
| tech/data-models.md                                      | `LobbyPlayer`, `PlayerConstraints`, `MailboxMessage`, `ParsedNote`, `ParsedLine`, `WerewolfPlayer` interfaces | none exist under those names; doc rewritten as pointers to the real type files                                                                                                                           |
| tech/i18n-strategy.md                                    | language from `localStorage` key `lgg_language`; four namespaces                                              | via `storage` + `STORAGE_KEYS.LANGUAGE` (`lgg_language`, legacy `language`); 17 top-level namespaces; 7 games ship their own bundles via `addResourceBundle`                                             |
| tech/song-pipeline.md                                    | `POST /api/songs`, `GET /api/songs/:id/stream`, SSE `/api/progress`, `scrapeUSDB()`, Demucs `htdemucs`        | job API `/api/usdb/download` + `/api/usdb/status/:jobId`, `/api/separator/job` + `/status/:jobId`, streaming via `/media`; model `UVR-MDX-NET-Inst_HQ_3.onnx`; alignment with `whisper-timestamped`      |
| tech/deployment.md                                       | `cd server && npm run package`; binaries `melodiq-server-*`; served by "Express static middleware"            | no `package` script ([Q1](../open-questions.md#resolved-2026-10-18)); release expects `nexumia-server-*`; SPA is hosted on Cloudflare Workers static assets (`wrangler.jsonc`), server has no Express    |
| tech/secrets-management.md, operations/server-runbook.md | server TLS via `config.json` `ssl`; key `securityToken`; `allowedOrigins` in config.json                      | no TLS in server; key `token` (or env `SECURITY_TOKEN`/`TOKEN`, auto-generated if empty); CORS via env `ALLOWED_ORIGINS`                                                                                 |
| tech/server-security.md                                  | CORS "Development: `*`, Production: list"                                                                     | empty/`*` → reflect any origin; otherwise list **plus** always localhost and RFC 1918 origins                                                                                                            |
| tech/testing-guide.md                                    | examples `werewolf/logic/gameReducer.test.ts`, `server/src/utils/parser.test.js`                              | neither exists; server tests are `server/test/*.test.js`; 62 frontend test files                                                                                                                         |
| workflows/ci-cd-pipelines.md                             | architecture check "blocks untyped `: any`"; `install_dependencies` GitLab job                                | not checked; job does not exist                                                                                                                                                                          |
| operations/backup-recovery.md                            | IndexedDB `LocalGameGalaxyDB`                                                                                 | no such database                                                                                                                                                                                         |
| tech/werewolf-architecture.md                            | key `werewolf_custom_roles`                                                                                   | `werewolf-custom-roles`                                                                                                                                                                                  |
| README.md                                                | Node 20; `cp config.example.json config.json`; testing guide "coming soon"                                    | Node 24 (`.nvmrc`); root example obsolete ([Q5](../open-questions.md#q5--root-configexamplejson-is-obsolete)); guide exists                                                                              |
| scripts/check-architecture.mjs                           | messages cite "AGENTS.md Section 4.3/4.5/3.2/4.2"                                                             | those section numbers never matched AGENTS.md; now cite section names                                                                                                                                    |

Docs whose content checked out (only links/front matter fixed): `webrtc-signaling.md`, `melodiq-architecture.md` (hooks and files exist), `c4-diagrams.md`, `styling.md`, `qwixx-sheet-rules.md`, ADR-0001..0003, `operations/webrtc-tracker.md` (`PORT`/`TRACKER_PORT`, `/health`, port 8000 confirmed), `workflows/jules-pipeline-workflow.md`.

## 4. Structural changes

| Change                                                                                       | Why                                                                                                                                                   |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| New root `docs/index.md` with "where to find what" table and front matter per OKF v0.2       | progressive disclosure for agents                                                                                                                     |
| New `open-questions.md`, `reports/`, `references/`, `archive/`                               | contradictions and dated findings get a home instead of being silently "fixed"                                                                        |
| New `tech/game-catalog.md`                                                                   | the most-asked question ("where is game X stored/synced/translated") had no answer                                                                    |
| `issues/backend-simplification/` (11 specs) → `archive/`                                     | all implemented (Hono server, no SSL, no admin UI, File System Access lite mode, Dockerfile)                                                          |
| `tasks/tabletop-engine/` (8 specs) → `archive/`                                              | tabletop engine shipped                                                                                                                               |
| 16 SOLID specs + ISSUE-132 → `archive/solid-tasks/`                                          | verified done in code (e.g. `modules/drawing`, `useMultiChannelSync`, `parseGameUrlParams`, split layout contexts, no native dialogs, no raw storage) |
| SOLID-13, -14, -17 and #353–#361 stay in `tasks/`                                            | still open (see [Q15](../open-questions.md#resolved-2026-10-18))                                                                                      |
| `tech/ui-modularization-solid-analysis.md`, `tech/foss_streaming_evaluation.md` → `reports/` | one-off analyses, dated                                                                                                                               |
| Four `00_SUMMARY.md` files deleted                                                           | duplicated the directory `index.md` files ("one topic, one home")                                                                                     |
| New `CLAUDE.md`, rewritten `AGENTS.md`                                                       | agents start from the bundle and keep it correct                                                                                                      |

## 5. Code findings that are not documentation problems

Listed in [open-questions.md](../open-questions.md): broken release job (Q1), `any` debt (Q3), Melodiq inline `BroadcastChannel` (Q4), dead `imposter.json` (Q6), scaffolder drift (Q7), unregistered/unused storage keys (Q8), stale budget baseline (Q9), Node 20 in Dockerfile (Q10), tracked 63.7 MB model (Q11), CHANGELOG merge artefacts (Q12).
