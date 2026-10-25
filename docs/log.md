# Log

Changes to this bundle, newest first. Format: `## YYYY-MM-DD — summary (agent)`, then bullets. Say whether code or configuration outside `docs/` changed.

## 2026-10-25 — Tabletop named saves and default templates (#538, claude-code)

- `docs/tech/tabletop-engine.md`: named saves (device / server), unique names, owner rules, default template; `galaxy_tabletop_db` v4. `verified.at` refreshed.
- `docs/tech/server-security.md`: API key permissions `allowTabletopSaves`, `allowTabletopTemplates`, `hasPermission`, save/template routes. `verified.at` refreshed.
- `docs/tech/persistence.md`: `named_saves` store. `docs/tech/architecture.md`: tabletop plugin bullet names the save and template routes.
- `docs/open-questions.md`: new question **(user)** on a local default template.
- Outside `docs/`: server `routes/saves.ts`, `services/saveStore.ts`, `core/auth.ts`, API key config; client `components/saves/*`, `useTableSaves`, `saveNames`, admin key dialogs (permission switches), locales.

## 2026-10-25 — One sheet-music library in Melodiq Notes (#534, claude-code)

- `docs/tech/song-pipeline.md` §4: song-folder scores appear read-only in the merged Melodiq Notes library (`stage/logic/scoreCatalog.ts`); only their bar marks are written; the client no longer uploads to song folders. `verified.at` refreshed.
- `docs/tech/architecture.md` (`notes` plugin bullet): the "Notes library" tab merges both stores.
- `docs/open-questions.md`: new Q18 **(user)** — move song-folder scores/marks into the Notes library, drop the upload route.
- Outside `docs/`: Melodiq Notes song picker (one "Notes library" tab instead of "Nexumia server" + "Notes library"), `notesLibrarySync.saveTargetFor`, `songScoresApi.uploadScore` removed, locales.

## 2026-10-25 — Melodiq Notes fine-tune and speed sliders (#532, claude-code)

- No `docs/` content changed; code: `stage/logic/tuning.ts`, `RecordingBar`, `StageToolbar`.

## 2026-10-25 — Drum voices in music-score (#531, claude-code)

- `docs/tech/song-pipeline.md`: `music-score` row mentions `drumVoices` (drum voice enum, GM key and MusicXML mapping, sticking, match ranks). Outside `docs/`: `src/modules/music-score/drumVoices.ts`, `ScoreNote.drum`/`hand`, drum highway glyphs.

## 2026-10-24 — Melodiq Notes seek bar and section groups (claude-code)

- `docs/tech/game-catalog.md`: melodiq-notes now has 4 `MELODIQ_NOTES_*` storage keys (`MELODIQ_NOTES_SEEK_LEAD_IN`).
- Outside `docs/`: `SeekBar`, `SectionStrip` groups, `StageEngine.seekTo` / `jumpToFirstNote`, logic in `stage/logic/seek.ts` and `sectionGroups.ts`.

## 2026-10-24 — Tabletop z-order (claude-code)

- `docs/tech/tabletop-engine.md` §1: new section "Stacking order" (`SET_Z_ORDER`, `logic/zOrder.ts`, move-to-top, context menu, shortcuts); `viewReducer.ts` row updated; front matter `verified` refreshed. Outside `docs/`: tabletop code and locales changed (#540).

## 2026-10-24 — Nexumia server rename and signaling image name (#530, claude-code)

- Companion server is now called Nexumia server. Docker images `nexumia/nexumia-server` (compose service `nexumia-server`, container `nexumia-server`, tunnel `nexumia-tunnel`); `nexumia/melodiq-server` is a deprecated alias. Dev compose service/container `nexumia-server-dev`. Updated: `deployment.md`, `external-sources.md`, `ci-cd-pipelines.md`, `dev-compose-workflow.md`, `monitoring-scaling.md`, `troubleshooting.md`, `server-runbook.md`.
- Signaling image: `docker-publish.yml` pushed to `${DOCKERHUB_USERNAME}/galaxy-signaling` while every compose file pulls `nexumia/galaxy-signaling`. Both publish targets now use the literal `nexumia` namespace. Open: [Q17](open-questions.md).
- Outside `docs/`: UI strings (de/en) and the server plugin name now say Nexumia server; the download helper links the `nexumia-server-*` release files it always should have; `composeYamlGenerator` emits `nexumia/nexumia-server`; `server/package.json` description. Routes, storage keys and the `server/` folder are unchanged.

## 2026-10-24 — Tabletop hidden zones: move, resize, reveal toggle, fog of war (claude-code)

- `docs/tech/tabletop-engine.md`: new "Hidden zones" section, viewReducer row names the zone actions.
- `docs/tasks/ISSUE-539-tabletop-hidden-space.md` stable; `docs/open-questions.md` gains remaining zone leaks.
- Outside `docs/`: tabletop code (#539), locales.

## 2026-10-24 — Several contributors (claude-code)

- `docs/workflows/multi-agent-token-strategy.md` §6a: claim issues before work, triage once, rights, models, log conflicts.
- Outside `docs/`: `/issue` checks assignees, open PRs and branches for `#N` and assigns the issue; `/triage` skips triaged issues unless `--force`. No app code changed.

## 2026-10-24 — /triage skill (claude-code)

- `docs/workflows/multi-agent-token-strategy.md` §6: triage every issue before work (labels `model:sonnet|opus`, `needs-decision`, `manual`, `tracking`; questions as issue comment), pick the session model from the label.
- Outside `docs/`: new `.claude/skills/triage/SKILL.md`; `/issue` reads triage answers and stops when the session model or open decisions do not fit; `CLAUDE.md` names both. No app code changed.

## 2026-10-24 — Inline by default after A/B measurement (claude-code)

- `docs/workflows/multi-agent-token-strategy.md`: §3/§4 rewritten — inline implementation with Haiku scout and gate-runner is the default, one Sonnet implementer only for large tickets; §7 records the #539 comparison (delegated ≥ $2.57 vs inline ≈ $1.98).
- Outside `docs/`: `.claude/skills/issue/SKILL.md` gets trivial / inline / delegated modes and makes the token table required before the PR; `.claude/agents/slice-implementer.md` handles all slices of a ticket. No app code changed.

## 2026-10-24 — /issue skill (claude-code)

- `docs/workflows/multi-agent-token-strategy.md` §6: `/issue <number>` runs the workflow and resumes from the spec's Progress list; `ISSUE-539` spec gains §7 Progress.
- Outside `docs/`: new `.claude/skills/issue/SKILL.md`; `CLAUDE.md` names it. No app code changed.

## 2026-10-24 — Token usage measurement (claude-code)

- `docs/workflows/multi-agent-token-strategy.md`: new §6 Sessions (one session per ticket), §7 Measuring with `npm run tokens` and the first data point.
- **Code changed:** new `scripts/token-usage.mjs`, npm script `tokens`, entry in `scripts/README.md`.

## 2026-10-24 — Multi-agent token workflow (claude-code)

- New `docs/workflows/multi-agent-token-strategy.md`: roles, delegate-or-not rule, flow, anti-patterns.
- New task spec `docs/tasks/ISSUE-539-tabletop-hidden-space.md` as the worked example (scout brief, open decisions, three slices). Found: `isWidgetHiddenForViewer` has no non-test caller.
- Outside `docs/`: new subagents `.claude/agents/{scout,slice-implementer,gate-runner}.md`; `CLAUDE.md` points to the workflow. No app code changed.

## 2026-10-23 — Terser agent instructions (claude-code)

- Outside `docs/`: `AGENTS.md` wording tightened (filler removed; rules, conditions and reasons unchanged); `CLAUDE.md` asks for short answers. No code changed.

## 2026-10-24 — Signaling image published (claude-code)

- `docs/tech/deployment.md` §1: the signaling image is now built by `docker-publish.yml` (was **Unverified**; compose files pointed at an image nobody published).
- **Code changed:** `.github/workflows/docker-publish.yml` job `build-and-push-signaling`, trigger path `signaling/**`.

## 2026-10-24 — Server setup in one place (claude-code)

- `docs/tech/deployment.md` §4b: the setup wizard is the single place for server setup; its Docker tab is the compose generator; outdated compose files removed.
- **Code changed:** compose generator moved to `src/components/connection/setup/compose/`, `SetupDockerTab.tsx` rebuilt on it, Settings → Server shows `ServerSetupCard` instead of a second generator; `DockerCommandCard.tsx`, `DockerComposeViewer.tsx`, `server/docker-compose.{ai,tunnel}.yml` deleted.

## 2026-10-24 — Save to server in Tabletop and Melodiq Notes (claude-code)

- `docs/tech/tabletop-engine.md` §6: game manager with device games, save-to-server, snapshot without tokens, native games load by server id.
- `docs/tech/architecture.md` §3.6: Melodiq Notes client for the `notes` plugin.
- `docs/tech/game-catalog.md`: tabletop now uses `lib/companion`.
- **Code changed:** `src/lib/companion/{companionHttp,notesLibraryApi}.ts`, tabletop `logic/{tabletopServerApi,serverGameSnapshot}.ts`, `hooks/useGameManager.ts`, manager components; Melodiq Notes `stage/logic/notesLibrarySync.ts`, `useStageSong.ts`, `NotesLibraryList.tsx`.

## 2026-10-24 — Companion server: Notes plugin, saved tabletop games, configurable compose, ARM64 binaries (claude-code)

- `docs/tech/architecture.md` §3.6: `notes` plugin, tabletop save routes, `NOTES_DIR`, auto-discovered data folders.
- `docs/tech/server-security.md`: auth and deletion rules for the new routes.
- `docs/tech/deployment.md`: Node 24 image, one volume per plugin, configurable compose generator, ARM64 release job.
- `docs/open-questions.md`: Q10 (Node version drift) resolved and removed.
- **Code changed:** `server/src/plugins/notes/`, `server/src/plugins/tabletop/routes/library.ts`, `server/src/utils/{scoreFiles,fileStream}.ts`, `server/Dockerfile`, `server/docker-compose*.yml`, compose generator in `src/features/settings/components/server/`, `STORAGE_KEYS.COMPOSE_GENERATOR`, `.github/workflows/release.yml`, `server/release-scripts/quick-install.sh`.

## 2026-10-24 — Score alignment for guitar and transposed recordings (claude-code)

- `docs/tech/architecture.md` §3.2: `music-score` alignment now estimates the recording's tuning, tries semitone shifts, and fits tones to pitch-class onsets.
- **Code changed:** `src/modules/music-score/{alignment,noteFit,onsets}.ts`, new `tuning.ts` and `chromaOnsets.ts` (+ synthetic band tests), Melodiq Notes recording bar shows the detected shift; new dev script `scripts/align-eval.mjs`.
- `docs/tech/architecture.md` §3.2: `music-score` lists `pinBar` / `nearestBar`.
- **Code changed:** new `src/modules/music-score/anchors.ts` (+ test); Melodiq Notes recording bar gets "Bar line here" (`useStageSong.pinBarNow`).

## 2026-10-24 — Motion tokens and reduced motion (claude-code)

- `docs/tech/architecture.md`: hooks list gains `usePrefersReducedMotion`.
- **Code changed:** `motion` tokens in `src/themeTokens.ts`, theme transitions, `src/lib/motion.ts`, global reduced-motion CSS (#507).

## 2026-10-24 — Emoji removed from UI icons (claude-code)

- `DESIGN.md` §7: note on Werewolf role icons (`RoleIcon`, Rounded MUI icons by role id).
- **Code changed:** decorative emoji removed from locale strings and components, Tabletop and Cards tiles use `AreaSymbol` (#504).

## 2026-10-24 — Game registry colour fields removed (claude-code)

- `docs/tech/data-models.md`, `docs/tech/architecture.md`: `GameDefinition` no longer has `colorStart`/`colorEnd`/`hoverColor`.
- **Code changed:** `src/lib/gameRegistry.tsx` and `scripts/scaffold-game.mjs` (#498).

## 2026-10-24 — Melodiq gameplay files split (claude-code)

- `docs/tech/sync-protocol.md`: phone-side message handling now lives in `hooks/usePhoneClientMessages.ts` and `hooks/usePhoneMicStreaming.ts` (was `PhoneClientEngine.tsx`).
- `docs/tech/melodiq-architecture.md`: names the new `lyrics/`, `pitch/` and `scoreboard/` folders.
- **Code changed:** Melodiq ScoreBoard, LyricsDisplay, PitchVisualizer and PhoneClientEngine decomposed and re-coloured (#496).

## 2026-10-24 — Qwixx state hook (claude-code)

- `docs/tech/game-catalog.md`: the local Qwixx storage constants now live in `useQwixxState.ts` (was `QwixxGame.tsx`).
- **Code changed:** Qwixx decomposed and re-coloured (#491).

## 2026-10-23 — DESIGN.md §2 names the colour gate (claude-code)

- `DESIGN.md` §2: hard-coded colours are no longer "review only"; points to the `check:architecture` ratchet. No code changed.

## 2026-10-23 — Remove unused opensheetmusicdisplay (claude-code)

- `docs/references/external-sources.md`: dropped the OpenSheetMusicDisplay row (no longer imported since the Melodiq Notes stage rewrite).
- **Code changed:** `opensheetmusicdisplay` removed from `package.json` / `package-lock.json`.

## 2026-10-23 — Hard-coded colour guard (claude-code)

- `docs/tech/coding-conventions.md` §2 and §4, `AGENTS.md` §4, `scripts/README.md`: hard-coded hex and non-black `rgb()`/`rgba()` in `src/**/*.tsx` are now a gate (per-file count ratchet), no longer review only.
- **Code changed:** `scripts/check-architecture.mjs` (+ `--init-colors` / `--update-colors`), new `scripts/lib/hardcoded-colors.mjs` (+ test), new `scripts/hardcoded-color-baselines.json`.

## 2026-10-23 — One page title, in the header (claude-code)

- `DESIGN.md` §6 header row: the page title lives only in `GlobalHeader`; content starts with section headings.
- **Code changed:** repeated in-content titles removed from card games lobby, game table lobby, Sudoku header and GuessArt setup; the party lobby sets its title via `usePageTitle` (was "Nexumia") and drops its own back button and heading; `party.lobbyTitle` is "Party-Lobby"/"Party Lobby"; unused `games.cards.suite_title/suite_subtitle` removed. Storyteller, Knister and Qwixx titles are in budget-blocked files (#497, #492, #491).

## 2026-10-23 — Colour migration to design tokens (claude-code)

- `DESIGN.md` §2.3 (piece helpers in code, exempt table content) and §10 step 5 status.
- **Code changed:** ~140 components switched from hard-coded colours to theme roles (`sx` palette paths, `alpha(theme.palette.*)` overlays, text roles); player/seat/avatar/spinner/instrument colours from `piecePalette` (`PIECE_ORDER`, `pieceColorForSlot`, `pieceNeutrals` new in `src/themeTokens.ts`); dialogs use the theme surface instead of their own glass backgrounds; gradient buttons/headings removed; settings navigation flat (`src/features/settings/settingsStyles.ts`); Melodiq Notes stage canvas colours and fonts from tokens; `seatLogic.test.ts` expectations updated. 35 files over their line budget are left for #491–#498.

## 2026-10-23 — Hub areas (claude-code)

- `DESIGN.md` §8.2/§10 step 4 done; migration tracked in issues #490–#499. `docs/tech/architecture.md` §3.1/§3.2: design tokens and areas listed; registry gradient fields unused.
- **Code changed:** new `src/lib/areas.ts` (+ test), `src/components/brand/AreaSymbol.tsx`, `src/features/hub/{HubAreaFilter,HubGameCard}.tsx`; `Hub.tsx` filters by area (Party, Musik, Karten, Rätsel) instead of seven emoji categories, tiles are flat cards with an area-coloured icon plate.

## 2026-10-23 — Design tokens, fonts and word mark live (claude-code)

- `DESIGN.md`: status, type table (actual `h3`/`h4`/`h6` sizes), §8 word mark as paths, §10 steps 1–2 done for dark. `docs/tech/styling.md` §1 and §6 describe the token file and the self-hosted fonts.
- **Code changed:** new `src/themeTokens.ts`; `src/theme.ts` rebuilt from it (sun-yellow primary, lagoon secondary/info, warm neutrals, `palette.piece`, focus ring, button edge, radii); fonts `@fontsource-variable/{figtree,bricolage-grotesque}` imported in `src/main.tsx`; `index.css`, `index.html`, PWA manifest `#121212` → `#17141C`; hub banner and `src/assets/nexumia-*.svg` replaced with the couch lock-up; `app.title` is "Nexumia" in de/en.
- Known: six game spots set white text on `primary` (Qwixx total, tabletop badges, Melodiq song tags) — unreadable on yellow (also poor on the old light blue); fixed with DESIGN.md §10 step 5.

## 2026-10-23 — Couch brand mark and app icons (claude-code)

- `DESIGN.md` §8: brand architecture — couch master mark, five areas as couch in piece colour plus name labels, app icon rules; sources in `design/brand/`, explorations in `design/logo-drafts/` and `design/brand-approaches/`.
- **Code/config changed:** `public/nexumia-icon.svg`, `public/pwa/*.png` (were one 640×640 JPEG under four PNG names; now real PNGs in the declared sizes), Android `mipmap-*/ic_launcher*.png`, `drawable*/splash.png`, `values/ic_launcher_background.xml` (`#FFFFFF` → `#17141C`). Manifest `theme_color`/`background_color` still `#121212` until DESIGN.md §10 step 1.

## 2026-10-23 — DESIGN.md visual system (claude-code)

- New root `DESIGN.md`: target visual system (colors for dark + light, piece palette, Bricolage Grotesque + Figtree, spacing, radius, components, logo brief, migration order). Not implemented yet.
- `docs/tech/styling.md`: corrected — the theme is dark only (no light tokens exist) and Roboto is declared but never loaded; links to `DESIGN.md`. `AGENTS.md` §4 links `DESIGN.md`.
- No code changed.

## 2026-10-23 — Review fixes for Melodiq Notes stage (claude-code)

- `docs/tech/song-pipeline.md` §4: score upload never overwrites (`replace=1` removed; it skipped the delete permission and left stale marks).
- **Code changed:** `server/src/plugins/melodiq/routes/scores.ts` (+ test); `src/modules/music-score/{alignment,midi}.ts` (+ tests); `src/lib/companion/songScoresApi.ts`; Melodiq Notes stage (`StageEngine.setLoop`, key handling in dialogs, stale async results in `useStageSong`, picker errors); `dev-dist/` restored to `main`.

## 2026-10-23 — Recording alignment fix (claude-code)

- `docs/tech/architecture.md` §3.2: `music-score` alignment now ends with `fitMarksToNotes` (band onsets, whole-song fit).
- **Code changed:** `src/modules/music-score/{dsp,alignment,onsets}.ts`, new `noteFit.ts` (+ test): analysis frames are placed per frame instead of with a rounded hop (the onset timeline drifted 0.14 s per minute); the Melodiq Notes stage clock follows the recording's tempo.

## 2026-10-22 — Melodiq Notes stage (claude-code)

- `docs/tech/game-catalog.md`: melodiq-notes size and shared modules (`lib/companion`, `modules/music-score`); `docs/tech/architecture.md` §3.2: `music-score` is used by melodiq-notes.
- **Code changed:** new `src/games/melodiq-notes/stage/*` (engine, canvas renderers, components, tests), `MelodiqNotesGame.tsx` rewritten, legacy OSMD view and its hooks removed; `src/lib/companion/songScoresApi.ts`; locales `games.melodiq_notes.stage.*`.

## 2026-10-22 — Sheet music in song folders (claude-code)

- `docs/tech/song-pipeline.md` §4: score files and bar marks in song folders, new `/api/songs/:id/scores…` endpoints; folder layout updated.
- **Code changed:** `server/src/plugins/melodiq/{services/scoreFiles.ts,routes/scores.ts}` (new), `services/scanner.ts`, `routes/{songs,media}.ts`, `index.ts`, `server/src/core/types.ts`; test `server/test/song_scores.test.js`.

## 2026-10-22 — Music score module (claude-code)

- `docs/tech/architecture.md` §3.2 lists `modules/music-score`.
- **Code changed:** new `src/modules/music-score/*` (+ tests), `@xmldom/xmldom` added as dev dependency for DOM-free tests.

## 2026-10-23 — Knister in the party room (claude-code)

- #467 slice 5 (Knister): `architecture.md` §3.2 lists `modules/room-game`; `sync-protocol.md` adds topic `lgg/room` and the host/guest message rules; `game-catalog.md` §1 notes Knister's room mode.
- **Code changed:** new `src/modules/room-game/*`, `src/games/knister/{KnisterEntry,KnisterRoomGame}.tsx`, `logic/knisterRoom.ts` (+ test), `src/features/party/{components/PartyPickerCard.tsx,hooks/usePartyRoomPlayers.ts}`; `PartyGamePickerModal.tsx` (split into cards), `PartyPendingGame.tsx`, `logic/{partyRoutes.ts,universalPartyManager.ts}`, `tableCatalog.ts`, knister i18n and index.

## 2026-10-23 — Gartic Phone route (claude-code)

- #467 slice 6: `docs/tech/game-catalog.md` §1 notes that the Gartic Phone route is registered in `src/App.tsx`.
- **Code changed:** `src/App.tsx` (lazy route `games/garticphone`).

## 2026-10-23 — Site Web Push sender (claude-code)

- `docs/tech/sync-protocol.md` §5 describes the stateless site Web Push (`/api/push/*`, `webPush` on player seats, ntfy fallback); `deployment.md` names the worker route and the VAPID secrets; `data-models.md` "Player seats" lists the seat's channels; `persistence.md` and the sync-protocol key table gain `PUSH_SITE_SUBSCRIPTION`.
- **Code changed:** new `cloudflare/{webPush.ts,webPushSend.ts}`, `src/lib/push/{siteWebPush.ts,cloudflareWebPush.test.ts}`, `scripts/generate-vapid-keys.mjs`; `cloudflare/worker.ts`, `wrangler.jsonc`, `src/lib/push/{pushClient.ts,pushSettings.ts,pushTypes.ts}`, `src/lib/storage.ts`, `src/modules/player-management/{playerSeats.ts,useSeatUpkeep.ts}`, `src/components/push/PushNotificationBanner.tsx`, GuessArt/Storyteller player types and turn senders, locales.

## 2026-10-22 — Party leave, remove and rename (claude-code)

- #467 slice 2 (rest): `docs/tech/sync-protocol.md` §3 describes the party roster merge (`updatedAt`, `left` departures, host-only slots).
- **Code changed:** `src/features/party/logic/{partyRoster.ts,partyRoster.test.ts,universalPartyManager.ts}`, `hooks/usePartyLobbyController.ts`, `components/{PartyPlayerRoster,PartyRoomHeader,PartyRemovedNotice}.tsx`, `PartyLobby.tsx`, locales.

## 2026-10-22 — Storyteller on player seats (claude-code)

- #467 slice 8: `docs/tech/data-models.md` "Player seats" and `sync-protocol.md` §5 cover Storyteller and the shared seat helpers; `architecture.md` §3.2 lists them under `player-management`.
- **Code changed:** new `src/modules/player-management/{seatedAssignment.ts,useSeatUpkeep.ts}` (+ `seatActions.test.ts`), `src/modules/sharing/{SeatStatusChip,SharePlayerActions}.tsx`, `src/games/storyteller/{hooks/useStoryJoinLink.ts,hooks/useStorySeats.ts,logic/storyTurnNotify.ts}`; `StorytellerGame.tsx` (407 → 263 lines), Storyteller `engine.ts`, `repository.ts`, `playerAssignment.ts`, `types.ts`, `useStorytellerLobby.ts`, `ShareStoryLinksDialog.tsx`; GuessArt `playerAssignment.ts`, `engine.ts`, `useGuessArtSeats.ts`, `useGuessArtJoinLink.ts`, `SharePlayerLinksDialog.tsx`; `src/modules/sharing/{ShareSessionLinksDialog.tsx,useSessionSharing.ts}`; `src/lib/utils/turnAssignment.ts` (+ test); locales; budget baselines.

## 2026-10-22 — Spieltisch lobby and mode picker (claude-code)

- #467 slice 3: `docs/tech/tabletop-engine.md` gains "Spieltisch (lobby)"; `game-catalog.md` §1 says the dice games are listed on the Spieltisch instead of the hub.
- **Code changed:** new `src/games/tabletop/logic/tableCatalog.ts` (+ test), `components/views/{PlayModeSheet,TableGameCard}.tsx`, `src/features/party/components/PartyPendingGame.tsx`; `TabletopLobbyView.tsx` rewritten, `TabletopGame.tsx`, `src/features/party/{PartyLobby.tsx,hooks/usePartyLobbyController.ts,logic/partyRoutes.ts}`, `src/features/hub/Hub.tsx` (dice games filtered out, dice chip removed), locales.

## 2026-10-22 — Party seats and transport (claude-code)

- #467 slice 2 (first part): `docs/tech/sync-protocol.md` §3 lists the party manager as a `MultiChannelSyncCoordinator` user; `game-catalog.md` party row updated; Q4 no longer names the party lobby.
- **Code changed:** `src/features/party/logic/{partyRoster,universalPartyManager}.ts` (+ test), `hooks/usePartyLobbyController.ts`, `src/App.tsx` (duplicate `/party` route removed).

## 2026-10-22 — Steam proxy worker on the Cloudflare deploy (claude-code)

- Q14 resolved (maintainer expected the import to work on Cloudflare without a companion): `docs/tech/deployment.md` describes the `/api/steam/*` worker, `tabletop-engine.md` §7 the metadata path and companion diagnostics; Q14 removed from `open-questions.md`.
- **Code/config changed:** new `cloudflare/worker.ts` (+ test), `wrangler.jsonc` (`main`, `assets.binding`, `run_worker_first`), `src/games/tabletop/logic/steamWorkshopApi.ts` (companion diagnostics, download fallback via `/api/steam/file`), `hooks/useWorkshopImport.ts`, locales, tests.

## 2026-10-22 — Table session plan: mode names (claude-code)

- `docs/reports/2026-10-22-table-session-plan.md` §2/§3: modes renamed to "Ein Gerät für alle" / "Jeder am eigenen Gerät" (the device is usually a phone in both); a shared table screen is optional.
- No code changed.

## 2026-10-22 — VirtualTabletop import quick wins (claude-code)

- `docs/tech/tabletop-engine.md` gains §7 "Import" (TTS and VirtualTabletop paths, what is not imported yet).
- **Code changed:** new `src/games/tabletop/logic/vttWidgets.ts` (+ test `vttImport.test.ts`), `logic/{pcioParser,pcioNormalizer}.ts`, `hooks/useWorkshopImport.ts`, `components/manager/ImportWorkshopDialog.tsx`, locales.

## 2026-10-22 — Tabletop pass and play (claude-code)

- #467 slice 1: `docs/tech/tabletop-engine.md` gains "Pass and play (local)"; `architecture.md` §3.2 lists `modules/pass-and-play`.
- **Code changed:** new `src/modules/pass-and-play/*` (+ test), `src/games/tabletop/components/views/TabletopPassAndPlay.tsx`, `components/surface/SurfaceSeatControls.tsx`, `hooks/useFitToScreen.ts`; `TabletopGame.tsx`, `components/editor/TabletopEditor.tsx`, `components/surface/TabletopSurface.tsx`, `logic/{seatLogic,boardFilter,tabletopReducer}.ts`, locales, test.

## 2026-10-22 — Table session plan (claude-code)

- New report `docs/reports/2026-10-22-table-session-plan.md` (party mode, tabletop, dice games, pass-and-play, mobile, import gaps); open questions Q14 (Steam import without companion) and Q15 (VTT routines).
- No code changed.

## 2026-10-22 — Workshop import error messages (claude-code)

- No doc change: `docs/tech/tabletop-engine.md` does not list the WorkshopError codes; the new codes `download_blocked` and `invalid_file` are in `steamWorkshopApi.ts` and the locales.
- **Code changed:** `src/games/tabletop/logic/steamWorkshopApi.ts` (+ test), `hooks/useWorkshopImport.ts`, locales.

## 2026-10-22 — GuessArt on player seats (claude-code)

- `docs/tech/data-models.md` "Player seats" and `sync-protocol.md` §5 say GuessArt uses seats, `turnDelivery` and the seat merge in `importSnapshot` (#416 last slice).
- **Code changed:** `src/games/guessart/{GuessArtGame.tsx,hooks/useGuessArt{Game,Lobby,UrlParam,Seats,TurnSeat,JoinLink}.ts,logic/{engine,repository,playerAssignment,notificationService,turnPush,types}.ts,components/{ActiveGamesList,SharePlayerLinksDialog,WaitingForDrawerView}.tsx}`, `src/modules/player-management/{seatActions.ts,PlayerJoinedSnackbar.tsx,playerSeats.ts}`, `src/modules/sharing/useSessionSharing.ts`, `src/lib/push/pushSettings.ts`, `src/lib/utils/turnAssignment.ts`, locales, tests; preceded by a formatting-only commit.

## 2026-10-22 — Player seats model (claude-code)

- `docs/tech/data-models.md` gains "Player seats (async games)"; `sync-protocol.md` §5 names `turnDelivery.ts`; `persistence.md` lists `DEVICE_ID` and the corrected key count (95).
- **Code changed:** new `src/modules/player-management/playerSeats.ts`, `src/lib/deviceIdentity.ts`, `src/lib/notifications/turnDelivery.ts` (+ tests); `STORAGE_KEYS.DEVICE_ID`.

## 2026-10-22 — GuessArt word selection and hint transitions (claude-code)

- #416 slices 2–3: no doc describes the engine internals; `CHANGELOG.md` updated.
- **Code changed:** `src/games/guessart/logic/{engine,transitions}.ts`, `transitions.test.ts`.

## 2026-10-22 — Device settings out of storage.ts (claude-code)

- #419: `docs/tech/persistence.md` names the new owners of the companion, signaling and push accessors; `verified` bumped.
- **Code changed:** `src/lib/storage.ts` (delegates), new `src/lib/companion/companionSettings.ts`, `src/lib/webrtc/signalingSettings.ts` (+ test), `src/lib/push/pushSettings.ts`.

## 2026-10-22 — PartyLobby split into sections (claude-code)

- #359: `docs/tasks/ISSUE-359-decompose-party-lobby.md` acceptance boxes ticked, `docs/tasks/index.md` row marked done.
- **Code changed:** `src/features/party/PartyLobby.tsx`, new `components/Party{ActiveGameBanner,RoomHeader,ServerInfoCard,ShareCard,PlayerRoster,GameSelection}.tsx`, `hooks/usePartyLobbyController.ts` (exports `PartyLobbyController`), `scripts/legacy-component-baselines.json`.

## 2026-10-22 — Tabletop private hands (claude-code)

- #449: `docs/tech/tabletop-engine.md` §5 "Private hands", link from `sync-protocol.md`.
- **Code changed:** `src/games/tabletop/logic/{handPrivacy,sealCrypto,privateHandChannel,syncProtocol}.ts`, `hooks/useTabletopSync.ts`, `TabletopGame.tsx`, tests.

## 2026-10-22 — Tabletop button routines (claude-code)

- #449: `docs/tech/tabletop-engine.md` gains §3 "Button routines" (later sections renumbered); `data-models.md` `WidgetType` updated.
- **Code changed:** `src/games/tabletop/logic/{types,routines,tabletopReducer,widgetTemplates}.ts`, `components/widgets/ButtonWidgetView.tsx`, `components/surface/BoardWidgetRenderer.tsx`, `components/editor/{RoutineEditor,InspectorFields}.tsx`, locales, test.

## 2026-10-22 — TTS States (claude-code)

- #449: `docs/tech/tabletop-engine.md` lists `NEXT_STATE`.
- **Code changed:** `src/games/tabletop/logic/{types,ttsTypes,tableTools,ttsContainers,ttsParser,tabletopReducer}.ts`, `logic/reducers/tableToolReducer.ts`, `components/{widgets/TokenWidgetView,surface/BoardWidgetRenderer,editor/WidgetInspector,editor/useTabletopEditor}`, locales, test; preceded by a formatting-only commit.

## 2026-10-22 — Tabletop image upload (claude-code)

- #449: `docs/tech/tabletop-engine.md` §3 describes `ImageUploadButton` and its size limit.
- **Code changed:** `src/games/tabletop/logic/imageUpload.ts`, `components/editor/{ImageUploadButton,InspectorFields,TableSettingsDialog}.tsx`, locales, test.

## 2026-10-22 — Tabletop resize/rotate handles (claude-code)

- #449: `docs/tech/tabletop-engine.md` §3 describes `SelectionHandles`.
- **Code changed:** `src/games/tabletop/components/editor/{SelectionHandles,TabletopEditor}.tsx`, `logic/handleMath.ts`, test.

## 2026-10-22 — Tabletop motion and flip animations (claude-code)

- #449 slice 7: `docs/tech/tabletop-engine.md` §3 names `TableMotionStyles`.
- **Code changed:** `src/games/tabletop/components/{surface/TableMotionStyles.tsx,widgets/CardWidgetView.tsx,editor/TabletopEditor.tsx}`; preceded by a formatting-only commit.

## 2026-10-22 — Tabletop label, timer, spinner widgets (claude-code)

- #449 slice 9: `docs/tech/tabletop-engine.md` lists `tableToolReducer.ts`; `docs/tech/data-models.md` `WidgetType` updated.
- **Code changed:** `src/games/tabletop/logic/{types,tableTools,widgetTemplates,tabletopReducer}.ts`, `logic/reducers/tableToolReducer.ts`, `components/widgets/{Label,Timer,Spinner}WidgetView.tsx`, `BoardWidgetRenderer.tsx`, `components/editor/{InspectorFields.tsx,useTabletopEditor.ts}`, locales, test.

## 2026-10-22 — Tabletop deck builder (claude-code)

- #449 slice 6: `docs/tech/tabletop-engine.md` §3 names `DeckBuilderDialog` and `deckBuilder.ts`.
- **Code changed:** `src/games/tabletop/logic/{deckBuilder,widgetEdits,tabletopReducer}.ts`, `logic/reducers/editReducer.ts`, `components/editor/*`, locales, test.

## 2026-10-22 — Workshop import errors (claude-code)

- #449 slice 8 (part 2): no doc covers these messages; `CHANGELOG.md` updated.
- **Code changed:** `src/games/tabletop/logic/steamWorkshopApi.ts`, `hooks/useWorkshopImport.ts`, locales, test; preceded by a formatting-only commit.

## 2026-10-22 — TTS bags, tiles, fog of war (claude-code)

- #449 slice 8 (part 1): no doc lists the TTS object mapping beyond the plan report; `CHANGELOG.md` updated.
- **Code changed:** `src/games/tabletop/logic/{ttsParser,ttsContainers,ttsTypes}.ts`, `components/widgets/BagWidgetView.tsx`, `components/surface/BoardWidgetRenderer.tsx`, test; preceded by a formatting-only commit.

## 2026-10-22 — Tabletop editor UI (claude-code)

- #449 slice 5: `docs/tech/tabletop-engine.md` §3 describes the editor components.
- **Code changed:** `src/games/tabletop/components/editor/*`, `logic/widgetTemplates.ts`, `logic/widgetEdits.ts` (`parseWidgetPatch`), `TabletopGame.tsx`, `data-widget-id` on `BoardWidgetRenderer`/`HolderWidgetView`, locales, tests; preceded by a formatting-only commit.

## 2026-10-21 — Tabletop engine doc, edit actions, undo history (claude-code)

- #449 slices 3–4: new `docs/tech/tabletop-engine.md` (listed in `docs/tech/index.md`).
- **Code changed:** `src/games/tabletop/logic/{tabletopReducer,widgetEdits,editHistory}.ts`, `logic/reducers/*`, tests.

## 2026-10-21 — Tabletop autosave/resume (claude-code)

- #449 slice 2: `docs/tech/persistence.md` and `game-catalog.md` list the new `sessions` store.
- **Code changed:** `src/games/tabletop/{TabletopGame.tsx,logic/tabletopStorage.ts,hooks/useTabletopAutosave.ts,components/views/RestartGameButton.tsx}`, locales, test; preceded by a formatting-only commit.

## 2026-10-21 — Tabletop host-authoritative sync (claude-code)

- #449 slice 1: `docs/tech/sync-protocol.md` describes the tabletop intent/delta/snapshot flow.
- **Code changed:** `src/games/tabletop/{TabletopGame.tsx,hooks/useTabletopSync.ts,logic/syncProtocol.ts,logic/stateDelta.ts,logic/tabletopReducer.ts}` + tests; preceded by a formatting-only commit.

## 2026-10-21 — Tabletop VTT plan report (claude-code)

- New `docs/reports/2026-10-21-tabletop-vtt-plan.md`, listed in `docs/reports/index.md`.
- No code changed.

## 2026-10-21 — Compose generator matches the real containers (claude-code)

- #342: `docs/tech/deployment.md` describes the generated compose file and why the standalone tracker stays.
- **Code changed:** `src/features/settings/components/server/{composeYamlGenerator.ts,ComposeGeneratorPanel.tsx}` (+ test), `server/docker-compose.yml`; preceded by a formatting-only commit.

## 2026-10-21 — Melodiq Notes soundfont fields shared (claude-code)

- #426 (sound settings): no doc described these fields; `CHANGELOG.md` updated.
- **Code changed:** `src/games/melodiq-notes/components/{SoundfontProviderFields,SoundSettingsSection}.tsx`, `src/features/settings/components/MelodiqNotesSettingsCategory.tsx`; preceded by a formatting-only commit.

## 2026-10-21 — Melodiq Notes dialog frame (claude-code)

- #426 (Melodiq Notes dialogs): no doc described the dialogs; `CHANGELOG.md` updated.
- **Code changed:** `src/games/melodiq-notes/components/{NotesDialogFrame,EnsembleMixerDialog,SongSelectDialog,SoundSettingsDialog}.tsx`; preceded by a formatting-only commit.

## 2026-10-21 — Lobby local-player rule shared (claude-code)

- #426 (lobby hooks): no doc names the rule; `CHANGELOG.md` updated.
- **Code changed:** `src/modules/player-management/playerLogic.ts` (+ test), `useGuessArtLobby.ts`, `useStorytellerLobby.ts`; preceded by a formatting-only commit.

## 2026-10-21 — Shared share-or-copy hook (claude-code)

- #426 (victory/stats modal): `docs/tech/architecture.md` §3.2 lists `useShareOrCopy`.
- **Code changed:** `src/modules/sharing/useShareOrCopy.ts`, `index.ts`, `SudokuVictoryModal.tsx`, `WordleStatsModal.tsx`; preceded by a formatting-only commit.

## 2026-10-21 — Melodiq latency calibrator dedup (claude-code)

- #426 (latency calibrator): no doc described the calibrator UI; `CHANGELOG.md` updated.
- **Code changed:** `src/games/melodiq/components/{LatencyCalibrator,RemoteLatencyCalibrator,LatencyCalibratorPanel}.tsx`, `components/hooks/detectBeep.ts`.

## 2026-10-21 — Shared dice roll animation (claude-code)

- #426 (dice rollers): `docs/tech/architecture.md` §3.2 lists `useDiceRollAnimation`.
- **Code changed:** `src/components/games/useDiceRollAnimation.ts`, `KnisterDiceRoller.tsx`, `QwixxDiceRoller.tsx`; preceded by a formatting-only commit.

## 2026-10-21 — STUN settings UI (claude-code)

- #422: `docs/tech/webrtc-signaling.md` §6 describes the new settings UI.
- **Code changed:** `src/components/connection/{ServerUrlList,StunServerSettings,DeviceTrackerSettings,DeviceConnection}.tsx`, `useStunServerSettings.ts`, `SignalingSettingsCard.tsx`, `src/lib/webrtc/iceServers.ts` (+ test), locales; preceded by a formatting-only commit.

## 2026-10-21 — Melodiq session players split (claude-code)

- #418: no doc described `useSessionPlayers`; `CHANGELOG.md` updated.
- **Code changed:** `src/games/melodiq/gameplay/hooks/{useSessionPlayers,useSessionOverrideSync,usePeerRosterSync,usePeerSessionMessages,useBroadcastSongInfo}.ts`, new `gameplay/logic/sessionRoster.ts` + test.

## 2026-10-21 — Tabletop holder layout extracted (claude-code)

- #414: no doc described the holder layout math; `CHANGELOG.md` updated.
- **Code changed:** `src/games/tabletop/logic/{holderLayout,tabletopReducer}.ts`, new `__tests__/holderLayout.test.ts`.

## 2026-10-21 — Melodiq download job split (claude-code)

- #413: `docs/tech/song-pipeline.md` §1 names the new helper modules.
- **Code changed:** `server/src/plugins/melodiq/services/{download,ytdlp,ultrastarTxt}.ts`, `routes/usdb.ts`, `server/test/ultrastar_txt.test.js`.

## 2026-10-21 — GuessArt transitions, slice 1 (claude-code)

- #416: no doc described the engine internals; `CHANGELOG.md` updated.
- **Code changed:** new `src/games/guessart/logic/transitions.ts` (+ tests), `engine.ts` `submitGuess`.

## 2026-10-21 — Lazy routes, Melodiq TV timer cleanup (claude-code)

- #427: no doc described the route loading or the TV poll; `CHANGELOG.md` updated.
- **Code changed:** `src/App.tsx`, `src/games/melodiq/hooks/useTVMode.ts`, `useQueue.ts` (comment only); preceded by a formatting-only commit.

## 2026-10-21 — Component budget lock-in, Q9 resolved (claude-code)

- #425: Q9 removed from `open-questions.md`; `coding-conventions.md`, `workflows/ci-cd-pipelines.md`, `architecture.md` and AGENTS.md §4 describe the lock-in and the single 250-line limit.
- **Code changed:** `scripts/check-component-budget.js`, `scripts/check-architecture.mjs`.

## 2026-10-21 — PartyLobby logic extracted (claude-code)

- #417: `tech/persistence.md` lists `PARTY_PLAYER_NAME` (`guessart_player_name`), previously an unregistered raw key in three files.
- **Code changed:** new `src/features/party/logic/playerName.ts`, `partyRoutes.ts` (+ tests), `hooks/usePartyLobbyController.ts`; `PartyLobby.tsx`, `useGarticGameState.ts`, `storage.ts`; budget baseline lowered.

## 2026-10-21 — Party roster rules extracted (claude-code)

- #415: no doc described the roster rules; `CHANGELOG.md` updated.
- **Code changed:** new `src/features/party/logic/partyRoster.ts` (+ tests), `universalPartyManager.ts` uses it.

## 2026-10-21 — WebRTC host identity dedup (claude-code)

- #412: no doc described the duplicated identity handling; `CHANGELOG.md` updated.
- **Code changed:** `src/lib/webrtc/WebRTCHostManager.ts`, new `src/lib/webrtc/peerRegistry.ts` (+ tests).

## 2026-10-21 — Dead Melodiq settings page, werewolf scenario tests (claude-code)

- #423 / #424: no doc referenced the removed files; `CHANGELOG.md` updated.
- **Code changed:** deleted `src/games/melodiq/MelodiqSettings.tsx`, `components/SettingsFeedbackForm.tsx`, `src/games/werewolf/logic/tests/verify_*.ts`; new `src/games/werewolf/logic/roleScenarios.test.ts`.

## 2026-10-21 — WebRTC tracker protocol module (claude-code)

- #411: `tech/webrtc-signaling.md` §1 points to `src/lib/webrtc/trackerProtocol.ts` and documents the NDJSON decoding and tracker URL filter.
- **Code changed:** new `src/lib/webrtc/trackerProtocol.ts` (+ tests); `WebRTCHostManager.ts`, `useWebRTCClient.ts` use it (preceded by a formatting-only commit).

## 2026-10-21 — Tabletop hand rule (claude-code)

- #410: no doc owned the hand-holder rule; it is documented in the header of `src/games/tabletop/logic/handHolder.ts` and in `CHANGELOG.md`.
- **Code changed:** `src/games/tabletop/logic/` (`handHolder.ts` new, `boardFilter.ts`, `gameValidator.ts`, `handLayout.ts`, `seatLogic.ts`, `tabletopReducer.ts`), `components/surface/HandDockStrip.tsx`, new tests.

## 2026-10-21 — Server config no longer persists env overrides (claude-code)

- #409: `tech/secrets-management.md` §3, `tech/persistence.md`, `operations/server-runbook.md` §3 describe the runtime-only env overrides and the start-up cleanup.
- **Code changed:** `server/src/config.ts`, new `server/src/core/configSources.ts`, new `server/test/config_env_overrides.test.js`.

## 2026-10-21 — Leaner agent context (claude-code)

- `AGENTS.md`: reuse catalog (§5) moved into `tech/architecture.md` §3.2, OKF editing rules (§9) moved to new `workflows/knowledge-base-maintenance.md`, Capacitor section (§7) shortened to a pointer to `tech/styling.md`; §1 now asks for targeted doc reads (one doc, grep `game-catalog.md`) instead of reading index, open questions and catalog up front. File shrank from ~13 KB to ~8 KB; it is loaded into every Claude Code session via `CLAUDE.md`.
- `CLAUDE.md`: session start no longer reads `index.md` and `open-questions.md` unconditionally; gate output hint.
- Incoming anchors fixed in `tech/coding-conventions.md` and `CONTRIBUTING.md`; `index.md` and `workflows/index.md` list the new doc.
- **Configuration outside `docs/` changed:** new `.claude/settings.json` (deny `Read` on secrets — `config.json`, `.env*`, keystores, VAPID keys — and generated/media folders), `.gitignore` ignores `.claude/settings.local.json`. No application code changed.

## 2026-10-21 — ESLint warning budget, Q3 resolved (claude-code)

- New gate `check:lint-budget` (#421): per-file warning ratchet with `scripts/lint-warning-baselines.json`; documented in `tech/coding-conventions.md#eslint-warning-budget`, `tech/pipeline-quality-gates.md`, `workflows/ci-cd-pipelines.md`, AGENTS.md.
- Q3 (`any` not enforced) resolved by the maintainer's choice of a ratchet; item removed, links in `architecture.md`, `tasks/index.md`, `ci-cd-pipelines.md` repointed.
- **Code and CI configuration outside `docs/` changed** (`scripts/`, `package.json`, `.husky/pre-push`, `ci.yml`).

## 2026-10-21 — Issue cleanup (claude-code)

- GitHub: closed 12 Jules audit issues (#350–#401, #386 as completed via #405), #361 (wrong premise), #247, #244 (answered), #347 (duplicate of #356); status comment on #342.
- `tasks/ISSUE-361-…` → `archive/issue-specs/`, `tasks/ISSUE-SOLID-17-…` → `archive/solid-tasks/` (duplicate of #359); `tasks/index.md`, `open-questions.md` Q15 note, `archive/index.md` updated.
- Removed agent leftovers in the repo root: `pr_comment.sh`, `pr_description.md`, `review.json`, `test.cjs` (none referenced).
- **Files outside `docs/` deleted; no source code changed.**

## 2026-10-21 — STUN server selection (claude-code)

- `tech/webrtc-signaling.md` §6 (ICE / STUN servers), `tech/persistence.md` (two new keys), `operations/troubleshooting.md` STUN hint.
- **Code changed:** `src/lib/webrtc/iceServers.ts` (+ tests), `storage.ts` keys, call sites in `WebRTCHostManager.ts` and `useWebRTCClient.ts`.

## 2026-10-21 — Google AI tooling removed (claude-code)

- Removed `scripts/agent-factory/` (Google AI Pro / `agy` worker pool); `tech/agent-factory.md` moved to `archive/`.
- Removed the optional Gemini Flash waiver from `scripts/check-docs-sync.mjs` and `GEMINI_API_KEY` from `ci.yml`; `ci-cd-pipelines.md` updated.
- **Code and CI configuration outside `docs/` changed.**

## 2026-10-21 — Jules pipeline removed (claude-code)

- Removed `.github/workflows/jules-start.yml`, `jules-audit.yml`, `scripts/pipeline/jules-*.cjs`, `.github/agents/` (Jules audit prompts), `.github/lenses/` (RepoLens lens copies only those prompts used) and `.pipeline-memory/`.
- `workflows/jules-pipeline-workflow.md` moved to `archive/` (deprecated); references dropped from `index.md`, `workflows/index.md`, `ci-cd-pipelines.md`, `secrets-management.md`, `references/external-sources.md`, `AGENTS.md`, `README.md`, `scripts/README.md`.
- **Code and CI configuration outside `docs/` changed.**

## 2026-10-21 — Cleanup plan report (claude-code)

- Added `reports/2026-10-21-cleanup-plan.md` from jscpd, budget, architecture and ESLint runs.
- Q9 extended: baselines are never lowered when a file shrinks.
- **No code changed.**

## 2026-10-18 — PR cleanup: #384 and #394 on main (claude-code)

- #384 merged; specs for #353, #354, #355, #357, #358 moved to `archive/issue-specs/`, Q15 resolved. #358 closed (parity baseline empty), PR #364 closed as superseded.
- **No code changed on this branch.**

## 2026-10-18 — Q0/Q1 resolved by PR #394 (claude-code)

- Q0/Q1 moved out of open-questions into server-security, deployment §4c, ci-cd, architecture; runbook caveat removed.
- **No code changed on this branch** (fixes are in #394 on `main`).

## 2026-10-18 — Q0/Q1 fixes referenced (claude-code)

- Q0 (tabletop auth, master-token leak incl. `/api/songs`) and Q1 (release binaries) are fixed in PR #394; docs mark them pending until merge.
- `config.json` lookup order corrected (`/app/config` was missing) in persistence, architecture, secrets-management, server runbook.
- **No code changed on this branch.**

## 2026-10-18 — Docs-vs-code audit and OKF restructuring (claude-code)

- Audited all 104 doc files against the code: 149 broken references in 49 files, invented APIs/messages/DB names, false "verified by CI" claims. Report: [reports/2026-10-18-docs-vs-code-audit.md](reports/2026-10-18-docs-vs-code-audit.md).
- New: root `index.md` with "where to find what", `open-questions.md` (Q0–Q15 without Q2/Q14, incl. a **security** finding in the tabletop routes and the broken release job), `tech/game-catalog.md`, `references/`, `reports/`, `archive/`, `tasks/index.md`.
- Rewritten against code: `tech/architecture.md`, `sync-protocol.md`, `persistence.md`, `data-models.md`, `song-pipeline.md`, `deployment.md`, `secrets-management.md`, `operations/server-runbook.md`; corrected sections in `server-security`, `i18n-strategy`, `testing-guide`, `onboarding-faq`, `coding-conventions` (enforcement column), `ci-cd-pipelines`, `troubleshooting`, `backup-recovery`, `android-release`, `monitoring-scaling`, `c4-diagrams`, `werewolf-architecture`, ADR-0004 (drift note).
- Moved: 11 backend-simplification specs, 8 tabletop specs, 16 SOLID specs + ISSUE-132 → `archive/`; two analyses → `reports/`. Deleted the four duplicate `00_SUMMARY.md`.
- Front matter normalised (block YAML, honest `verified`), local `file:///` links replaced by relative links.
- Outside `docs/`: new `CLAUDE.md`, rewritten `AGENTS.md`, README/CONTRIBUTING corrected, `scripts/check-architecture.mjs` rule messages now cite `docs/tech/coding-conventions.md`. No application code changed.

## Earlier entries (pre-OKF-v0.2 format)

## 2026-10-04

- **Update**: Replaced the multi-workflow Jules pipeline with a minimal `/plan` + cron watcher (`jules-plan.yml`, `jules-watch.yml`); removed lens, reviewer, auto-fixer, suggestions workflows and scripts.

## 2026-09-27

- **Update**: Converted entire documentation corpus to the Open Knowledge Format (OKF) v0.2 specification.
- **Update**: Modernized `docs/tech/architecture.md` (SSoT) to fully represent all 13 games, 6 shared modules, Hono micro-kernel, Cloudflare Quick Tunnel, and segregated layout contexts.
- **Fix**: Resolved merge conflict markers and eliminated developer-specific local file URLs (`file:///home/deck/...`) in favor of portable bundle-relative links.
- **Creation**: Established bundle root `index.md` with progressive disclosure navigation and sub-indices in `tech/`, `workflows/`, `adr/`, and `operations/`.

## 2026-09-26

- **Update**: Added 5-minute status watcher, fast-path plan waiter, and autonomy directives to the Jules agent pipeline (`docs/workflows/jules-pipeline-workflow.md`).
- **Update**: Documented Melodiq instrument practice, mobile responsive layouts, and OpenSheetMusicDisplay multi-stem audio player.

## 2026-09-22

- **Update**: Migrated companion server architecture from Express to Hono modular micro-kernel (`server/src/index.ts`).
- **Update**: Added Cloudflare Quick Tunnel integration for instant HTTPS party sharing.

## 2026-09-04

- **Creation**: Published comprehensive UI & Logic Modularization Analysis and SOLID Guidelines (`docs/tech/ui-modularization-solid-analysis.md`).
- **Creation**: Established 250-line component budget ratchet and Zero-Tolerance Anti-Pattern Matrix.
