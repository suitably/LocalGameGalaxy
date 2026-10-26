## [Unreleased]

### Added

- **Melodiq Notes: players join the stage at any time and are judged on their own device** (#573, #546): the stage shows the game and every player in split screen — players on this screen and players who joined through "Invite players" on their phone or tablet. A joining player gets their seat at once, also mid-song. Their device shows the falling notes and their own score, takes MIDI, microphone, keys or touch and judges the notes itself on the stage's synced clock; the stage merges the results. Each device keeps its own input latency (calibrated with a beep from the stage, or set by hand). The computer keys of the stage never drive an invited player. Invite links carry the companion server when one is active. The beep latency calibrator moved to `modules/audio` and is shared with Melodiq.

- **Melodiq Notes: alignment copes with extra intro/outro bars**: when an arrangement has bars at the start or end that the recording does not (a brass intro, a longer ending), automatic alignment now leaves them out instead of squeezing the whole beginning out of place; those bars sit before the recording starts. Tambourine notes on the drum highway are marked "Tb" and other percussion "Pc" instead of looking like hi-hat strokes.
- **Melodiq Notes: alignment copes with extra intro/outro bars**: when an arrangement has bars at the start or end that the recording does not (a brass intro, a longer ending), automatic alignment now leaves them out instead of squeezing the whole beginning out of place; those bars sit before the recording starts, and the stage leaves them out (no notes, it starts at the first bar the recording has). Tambourine notes on the drum highway are marked "Tb" and other percussion "Pc" instead of looking like hi-hat strokes.
- **Light mode** (#499): Settings → General → Appearance (System / Dark / Light, default System); TV views stay dark. Theme built with MUI `colorSchemes` from `lightTokens`; mode stored in our own `lgg_color_mode` key.
- **Server: one-click setup with auto-pairing** (#148): Melodiq's "Set up server" button (formerly an outdated helper download) opens Settings → Server with the setup wizard (OS detected, matching release archive). On first start the Nexumia server opens the app with a one-time pairing link; after a confirmation the app trades the code for its own API key (`POST /api/pair`, single use, 10 min, rate-limited) and saves URL and key, so nobody copies a token. Later starts print the link in the console; hints cover mixed content and opening the server URL once.
- **Melodiq Notes: play on your own device** (#485): "Invite players" on the stage shows a link and QR code per part. Each player's phone or tablet (the "Pult") then shows only their instrument — keys, strings or drum pads, or the microphone for voice — takes MIDI, microphone or computer keys there and sounds locally, while the stage keeps the notes, band, clock and judging. The pult measures its clock offset to the stage (ping/pong) and stamps every hit with stage time, so the stage judges it at the beat it was played despite the network delay. Uses the party-room transport (`modules/room-game`, new `useRoomEvents`).
- **Melodiq Notes: drums-only scores align** (#484): a score with only a drum part is aligned to the recording from its attacks (tempo and start by cross-correlating kick, snare and cymbals with the recording's onsets, then bar by bar) instead of the pitch match, which found nothing to follow and placed bar 1 far off.
- **Melodiq Notes: recording from YouTube** (#486): "Find on YouTube" in the recording bar searches the piece on stage on YouTube and lets the companion server download the audio (existing yt-dlp queue) into a Melodiq song folder — a matching existing folder without a recording, else a new one; a matching folder that already has a recording is used as it is. The score is stored in that folder and alignment starts right away. Server: `POST /api/usdb/download` accepts `songId` (download into that song's folder, keeping its video), and `GET /api/usdb/status/:jobId` reports the indexed `songId`.
- **Melodiq: host settings from an admin phone** (#356): admin phones open a small "Host settings" dialog (volumes, playback mode, lyrics options) that changes the host's settings over the existing WebRTC connection; other roles never see it and the host rejects their requests.
- **Melodiq: choose P1 or P2 on the phone** (#146): for duet songs a phone singer picks the part they sing; the choice is sent to the host.
- **Melodiq: resume after reload** (#152): a song that was running when the page reloaded (or the user left for another route, e.g. to set up a token) resumes at its last position; the mini player also offers "Restart from the beginning".
- **Melodiq Notes: finer alignment and continuous speed** (#532): fine-tuning has a ±2 s slider in 1 ms steps plus ±10 ms / ±1 ms buttons; playback speed is a continuous 25–150 % slider (5 % steps, pitch-preserving for recordings) for practising and fine-tuning.
- **Melodiq Notes: real drum instruments** (#531): drum parts keep the written sound (hi-hat closed/open/pedal, toms 1–3 and floor tom, snare normal/rimshot/cross-stick/ghost, kick, crash, ride, ride bell, china, splash, cowbell) from MusicXML instrument, notehead and articulations or General MIDI keys 35–81. The drum highway marks them on the notes (+, o, 1–3, F, x, RS, Bell, …) and shows sticking (R/L) when the score has it; MIDI hits prefer the exact sound and accept any hi-hat for a hi-hat, any tom for a tom.
- **Tabletop: table gestures** (#537): a tap on a deck still puts the top card in your hand, dragging takes the top card face down onto the table, and holding the deck picks up the whole deck. F, a double tap or the context menu flips a card; S, shaking while dragging or the context menu shuffles a deck or rolls a die. Dragging a die no longer rolls it. Bags work like decks without shuffling: a tap places an item next to the bag, a drag takes one (an infinite bag a new copy) instead of moving the bag, a long press moves the bag. The context menu offers the stacking order entries again.
- **Tabletop: hand like on mobile card games** (#536): the hand dock overlaps the cards in a slight fan so the whole hand fits a phone; a tap enlarges a card (play it or return it to the deck), a button enlarges the whole hand. New spectator seat (eye chip, pass-and-play cover, `role=spectator` on phones): sees the table, has no hand and cannot draw. Fixed: player 1 sometimes drew into another hand at the start, and phone draws after the first card went to the discard pile.
- **Tabletop: hidden zones** (#539): in edit mode the owner moves and resizes their hidden zone like a widget, and the widgets inside move along (pinned and non-movable ones stay). An eye button inside the zone shows and switches whether only the owner or everyone sees the contents. Other players now really see only placeholders for widgets inside a hidden zone.
- **Tabletop stacking order** (#540): a piece you move lands on top of the others; the right-click menu (long press on touch devices that send a context menu) offers Bring to front / Bring forward / Send backward / Send to back, and Ctrl/Cmd+] / [ (with Shift: front / back) reorder the selected pieces. Send to back stays until the piece is moved again; the order is synced like any other move.
- **Melodiq Notes: timeline and section groups** (#533, #535): a seekable timeline bar (drag or click, like a video player) and a "Jump to first note" button with a configurable lead-in (0–10 s, default 3 s); the section strip shows at most five groups that open into their sections on tap, and sections without notes carry no rating and cannot be looped.
- **Tabletop: save games to the server**: the game manager also lists the games that only live in this browser, and "Save to server" moves them into the companion server's library so every device has them. Editing a saved server game overwrites it; editing a read-only one saves a copy. Images from local folders and the server's asset folders are embedded, so a stored game contains no token.
- **Melodiq Notes: save to the Notes library**: "Save to Notes library" stores the open score (the original .mxl/.musicxml/.mid), a recording chosen on this device and the bar marks on the companion server; the song picker's new "Notes library" tab opens them again with their recording and marks, and can delete a piece.
- **Companion server – Melodiq Notes library** (plugin `notes`, `NOTES_DIR`): pieces with sheet music (MusicXML/MIDI), recordings and bar marks are stored in their own folder per piece, independent of the karaoke library; endpoints `/api/notes/pieces*` (create, rename, upload, marks, delete) and `/notes/media/:id/:file` with range streaming.
- **Companion server – save tabletop games**: `POST /api/tabletop/games` stores a game from the app in `<tabletop dir>/saved/<name>/game.json`, `PUT`/`DELETE /api/tabletop/games/:id` change or remove it; the rest of the library stays read-only and the listing marks saved games with `saved`.
- **Docker per plugin**: the image has one volume per plugin (`/app/music`, `/app/models`, `/app/tabletop`, `/app/notes`) and runs on Node 24.
- **Server setup in one place**: "Set up or adjust server" (Settings → Server and next to the connection fields) opens one wizard for the server app, Docker, Cloudflare and the terminal one-liner, all with the same token. Its Docker tab is configurable (Melodiq, Melodiq Notes, Tabletop, signaling, tunnel, AI image, ports, host folders), remembers the choices, downloads the file and can connect this device to `localhost`. The old Docker tab pulled a non-existent `:ai` image, mounted the music folder read-only and opened an unused port 3001; it and `server/docker-compose.{ai,tunnel}.yml` are gone.
- **Server app for Apple Silicon and ARM Linux**: releases add `nexumia-server-macos-arm64.tar.gz` and `nexumia-server-linux-arm64.tar.gz` (built on ARM runners); the quick installer picks them automatically, and every server archive ships empty `music/`, `tabletop/` and `notes/` folders.
- **Motion tokens and reduced motion** (#507): theme transitions use 150 ms (hover/press) and 250 ms (enter/exit) with the DESIGN.md easing, `transition: all` is replaced by explicit properties (`transitionOf` in `src/lib/motion.ts`), `prefers-reduced-motion` shortens all CSS animations, and dice rolls and the Melodiq Notes beat pulse follow it via `usePrefersReducedMotion`.
- **New look (Nexumia brand)**: couch logo and word mark, new app icons for browser, PWA and Android (the PWA icons were one JPEG under four PNG names), warm dark theme with sun-yellow primary, self-hosted fonts Figtree and Bricolage Grotesque (offline). Design rules in `DESIGN.md`. The hub groups games into areas (Party, Musik, Karten, Rätsel), player colours are the same eight piece colours in every game, and most screens use the theme colours instead of their own (remaining screens: #490).
- **Companion server**: song folders can hold sheet music (`.mxl`, `.musicxml`, `.mid`) next to the UltraStar files; new endpoints to upload a score, store its bar marks (`<score>.marks.json`) and delete it. The song list reports the scores per song.
- **Music score module** (`src/modules/music-score`): MusicXML (.musicxml/.mxl) and MIDI import into one shared song timeline (repeats and 1st/2nd endings written out, tempo changes, transposition, drums, lyrics, ties); string/fret assignment for guitar, bass and ukulele; automatic alignment of a recording to the score as one mark per bar (pitch-profile DTW, then one fit of the score's attacks to onsets in three frequency bands over the whole song — kick and bass low, tones mid, snare and cymbals high); export of the bar marks as per-bar tempos into the MusicXML so the score plays in time with the recording.
- **Knister with everyone on their own phone**: on the Spieltisch, "Jeder am eigenen Gerät" opens the party lobby; the host starts Knister for the room, every phone shows its own sheet, anyone rolls, everybody writes the same sum, and the next roll unlocks once all have placed it. Built on the new shared module `src/modules/room-game` (host runs the reducer, guests send actions), which Kniffel and Qwixx can use next. The party game picker lists the dice games under "Karten, Brett & Würfel" (#467).
- **Turn notifications without a server or extra app**: the site's Cloudflare worker now sends Web Push itself (`/api/push/*`, stateless, VAPID secrets in Cloudflare). A device that allows notifications subscribes once; its subscription travels with its player seat, so GuessArt and Storyteller wake the next player's phone even when the page is closed. ntfy remains the fallback (and the choice for devices without Google services); on iPhone a hint explains that notifications need "Add to Home Screen". Key pair: `node scripts/generate-vapid-keys.mjs`.
- **Party lobby**: guests can leave the party and the host can remove a player; both reach every device, and a device that still lists the player no longer adds them back. A renamed player keeps the new name on all devices instead of flipping back to a stale copy. A removed guest sees a notice with "Join again" (#467).
- **Tabletop Workshop import without a companion server**: the Cloudflare deploy gets a small worker for `/api/steam/*` only (`cloudflare/worker.ts`) that fetches Steam Workshop details and, if the browser may not, the mod file; everything else stays static. A configured companion server that fails is now reported with its reason (HTTP server from an HTTPS page, unreachable, token refused, HTTP status) instead of "without companion server".
- **Tabletop VirtualTabletop import**: `.vtt`, `.pcio` and `.zip` files can be uploaded (with their images); labels, buttons, spinners and timers keep their type instead of becoming plain tokens, dice use their faces (d8 stays d8), multi-face pieces become switchable looks, and the game name, rules and player range come from `_meta` (which no longer appears as a widget). All 579 variants of VirtualTabletop's library still import without errors (#467).
- **Tabletop pass and play**: in local play a "<name> done" button covers the table for the next player ("Hand the device to …", other players selectable on the cover); the hand and seat-only zones change only when that player taps to reveal. Games with private hands but no seats (built-in card deck, Liar's Dice) get one seat per hand, and the seat chips are hidden in this mode. Shared module `src/modules/pass-and-play` for other games (#467).
- **Player seats**: pure model for which device plays which player in async games (`modules/player-management/playerSeats.ts`), a stable device id (`lib/deviceIdentity.ts`) and one turn-notification rule (`lib/notifications/turnDelivery.ts`), with tests; GuessArt and Storyteller move to it next.
- **Tabletop**: button widget with a declarative routine (shuffle, draw, roll, flip, move, set, counter, timer, spin, next state) — validated JSON, no code; edited in the inspector, runs as one synced action on the host (#449).
- **Tabletop TTS import**: object `States` become switchable looks (`states`, `NEXT_STATE`); double-click a token or use the inspector button to switch (#449).
- **Tabletop editor**: upload images for widgets and the table background; they are scaled to 512 px and stored in the game as WebP data URLs, no server needed (#449).
- **Tabletop editor**: resize and rotate handles on the selected widget (Shift keeps proportions, rotation snaps to 15°, Alt rotates freely); one undo step per drag (#449).
- **Tabletop**: new widget types — text label, timer (countdown or stopwatch, start/pause/reset) and spinner wheel (result decided by the host); addable and editable in the editor; new widgets are placed slightly offset so they do not stack (#449).
- **Tabletop editor**: deck builder — create a card deck from a list of image URLs or a spritesheet (columns, rows, count) with optional back image and card size (`logic/deckBuilder.ts`, `ADD_WIDGETS`) (#449).
- **Tabletop editor**: edit mode on the TV and in local play — add tokens, cards, card areas, player hands, counters and dice; select a widget on the table or from a list; edit position, size, layer, rotation, image, owner seat, pinned and type-specific fields; duplicate, delete, raw JSON; table size and background; undo/redo (also Ctrl+Z / Ctrl+Shift+Z) (#449).
- **Tabletop**: editor building blocks — `PATCH_WIDGETS`, `ADD_WIDGET`, `DELETE_WIDGETS`, `UPDATE_TABLE` actions (`logic/widgetEdits.ts`) and undo/redo history on game deltas (`logic/editHistory.ts`, `APPLY_EDIT_DELTA`); `tabletopReducer.ts` split into deck, bag, piece, view and edit sub-reducers (945 → 364 lines) (#449).
- **Tabletop**: running games are autosaved (host or local play) and resume after a reload; a restart button with confirmation starts the game from its definition again (`galaxy_tabletop_db` v3, store `sessions`) (#449).
- **WebRTC**: STUN servers can be chosen per device in the connection and server settings, next to the tracker list: toggle built-in servers (Google stays off by default), add or remove custom `stun:`/`stuns:` URLs, with a warning when all are off. Tracker and STUN lists share one `ServerUrlList` component (#422).
- **Testing & Edge-Case Audit**: Added comprehensive unit tests for Kniffel scoring (`kniffelScoring.ts`) and game reducer (`kniffelReducer.ts`), Darts game rules, countdown modes, double-out evaluation, and bust logic (`useDartsGame.ts`), and Imposter database repository & seeder (`imposterRepository.ts`, `dbSeeder.ts`) (Fixes #386).
- **Sync & Resilience Tests**: Extended `MqttMailboxService` and `MultiChannelSyncCoordinator` test suites with coverage for listener error isolation, LZString payload compression, and dynamic channel re-subscription edge cases (Fixes #386).

### Changed

- **Melodiq Notes: one sheet-music store** (Q18, follows #534/#486): the Notes library on the companion server is the only place for scores and bar marks. A piece can belong to a Melodiq song (`songId`) and then plays with that song's mix instead of a copy; the library lists every piece once with a "Melodiq song" badge instead of merging song folders by title. On startup the server imports scores found in song folders (with their marks) once into linked pieces and leaves the originals in place. "Find on YouTube" now links the piece on stage to the downloaded song (or creates a linked piece) instead of copying the score into the song folder. Server: `POST`/`PUT /api/notes/pieces` accept `songId`; `POST`/`DELETE /api/songs/:id/scores` are deprecated and answer `410`, `GET /api/songs/:id/scores` and the marks routes read and write the linked pieces.
- **Melodiq Notes: one sheet-music library** (#534): the song picker's "Notes library" tab lists the Notes library pieces and the sheet music in Melodiq song folders together (same artist and title shown once); song-folder scores carry a "Melodiq song" badge and are read-only. Saving goes to the Notes library — a song-folder score with a recording chosen on this device becomes a Notes piece; played with the song's own mix it still keeps its bar marks in the song folder. The separate "Nexumia server" tab and its score upload are gone; a failing store no longer hides the other.
- **Melodiq Notes score alignment** follows guitar parts and transposed recordings: the recording's tuning is measured and the score is tried up to two semitones up or down (a band tuned to E♭, a score in another key); tones are matched to onsets of their own pitch classes instead of any mid-range attack, so a snare hit no longer pulls a guitar bar; the coarse match also uses attacks and prefers a steady tempo; onset timing is corrected for the analysis window (about 12 ms early before). The recording bar shows a detected shift. `node scripts/align-eval.mjs <score> <audio>` runs the alignment on real files.
- **Melodiq Notes: fix a bar by hand**: "Bar line here" in the recording bar moves the bar line nearest to the playing position onto that moment; bars up to the next hand-set bar are stretched along, without one the change fades out over four bars. Saved with the marks as before.
- **GuessArt and Gartic Phone leftover polish** (#503 #504 #506 #507 #508): the round-success dialog, word editor, round history and album reveal are split into smaller components; language flags and the album emoji/arrow became Rounded icons and DE/EN labels.
- **Leftover polish pass** (#503 #504 #506 #507 #508): `ModernScoreAdjuster`, `SongActionDialogs`, `QueueParticipantDialog`, `QwixxSheetSelector` and `ServerDirectoryManager` are split into smaller components/hooks and use Rounded icons, theme colours, `transitionOf` and `scoreText`.
- **Werewolf**: setup, night phase and role editor are split into focused components and a `useWerewolfSetup` hook (night-order rules moved to `logic/nightRoles.ts` with tests); built-in role icons are Rounded MUI icons instead of emoji (`RoleIcon`), cards use outlines instead of elevation, narrator and role-info buttons got labels (#503 #504 #506 #508).
- **Typography rules (#508)**: new `display` typography variant (3.5rem, weight 800) and shared `scoreText` helper (display face + tabular numbers) used for Darts, Sudoku, Imposter, tabletop and Melodiq timers/scores; text below 0.75rem raised to the caption size and weight 900 reduced to 800.

- **Radius scale and flat surfaces**: border radii use the DESIGN.md steps only (8/12/20 px, circle, pill) and cards and panels no longer carry elevation shadows; dialogs, menus and other overlays keep the theme shadow (#506).
- **Flat surfaces**: removed the remaining gradients, glow shadows and glass blur from the install banner, feedback dialog, Melodiq scoring and lyrics dots, Knister number picker, Sudoku pause and Tabletop selection/seat/HUD highlights (#505). The lyrics bar over video keeps its blur for legibility.
- **Icons**: decorative emoji removed from headings, buttons, menus and status texts in the hub party mode, push settings, Sudoku, Qwixx, Melodiq, Knister and connection screens (de and en). Werewolf winner and role screens, Spieltisch and Cards game tiles now use Rounded icons or area symbols (#504).
- **Icons**: all `@mui/icons-material` imports use the Rounded variant (DESIGN.md §7); `*Outlined` icons map to their Rounded counterpart. Exceptions: the `GitHub` brand icon (no Rounded variant) and seven over-budget components that Prettier would push over their line budget (ServerDirectoryManager, QueueParticipantDialog, SongActionDialogs, QwixxSheetSelector, Werewolf GameSetup/NightPhase/RoleEditDialog) (#503).
- **Drawing viewer**: the stroke replay logic is a tested pure module and the viewer file is half its former size (#498).
- **Settings navigation**: the header tabs, drop-down, compact menu and sub-pills are generated from one table; theme colours replace the fixed blue; English defaults for all labels, missing Melodiq tab labels added to both languages (#498).
- **App header**: burger menu and home/back navigation moved into their own component and hook; the bar uses theme colours (#498).
- **Server connection settings**: the connection card, setup wizard and UltraStar DB credentials are split into smaller components and hooks; gradient button, blurred dialog and hard-coded colours replaced by theme colours (#498).
- **Game registry**: dropped the unused per-game gradient colours (the hub colours games by area); lazy game imports share one helper (#498).
- **Melodiq library, history and settings**: song cards, search bar, playlists, history drawer and the Melodiq settings page are split into smaller components and use theme colours (no hard-coded white/rgba overlays, local-song tag in primary with contrast text); "Undo session" and "Reset defaults" are now translated (#495).
- **Melodiq**: score board, lyrics, pitch stage and phone client are split into small components, hooks and tested logic (`scoreBoardRanking`, `lyricsLines`, `pitchLayout`, `apiChunkBuffer`); singers are drawn in the eight piece colours (nearest to their profile hue) instead of free HSL colours, the canvas and score screens read theme colours, and gradients, glows and lift-on-hover are gone (#496).
- **Storyteller, Gartic Phone, Imposter**: lobby, header and setup screens split into smaller components and hooks and recoloured with theme and piece colours (Party area pink for Storyteller, green/red role colours for the Imposter result); the in-content Storyteller title is gone (the page title lives in the header) (#497).
- **Kniffel and Knister**: boards split into focused components and hooks; player columns use the piece-colour tints, scores use the display face with tabular figures, status colours follow the theme; removed the gradient, glow and blur effects and the duplicate Knister title (#492).
- Cards: decomposed the Schwimmen, Oh Hell and score-sheet views into shared presenters (`components/common/`), a `useSchwimmenState` hook and tested `logic/cardPlayers.ts`; re-coloured with piece/background tokens, removed gradients and emoji icons (#494, #360).

- **Qwixx**: score sheet split into focused components and a `useQwixxState` hook; rows use the piece palette, scores and totals the theme tokens; gradients, glows, blur and emoji icons removed (#491).
- **Wordle**: decomposed (`WordleGame.tsx` 247 → 141 lines, new `useWordleScreen`, `WordleToast`, `WordleHelpDialog`, shared `tileStyles`); letter states use theme roles (correct → success, present → warning, absent → raised) with non-colour cues (underline / dashed ring) and an `aria-label` per tile and key; emoji removed from UI labels (#493).
- **Melodiq Notes players and backing**: one player by default; "Add player" adds up to four, each row picks its part and how it is shown and can be removed. The backing is one global choice without a recording — everything (the players' parts too), backing only, or silent — and switches mid-song; with a recording there is just recording on/off. Replaces per-track roles and the solo/band presets.
- **Melodiq Notes stage**: new learning and play view for keyboard, guitar, bass, drums, ukulele and voice. Notes fall onto keys, strings (with fret numbers), drum lanes or a pitch line; alternatively a notation view (staff, TAB or drum notation). Modes: learn (waits for the right note), practice (loop a section at reduced speed) and perform (timing judged, score, combo, stars). Up to four players on one screen as a band; the other parts are played by the synth or a recording (MP3/OGG from the song folder or a local file) that is aligned to the score bar by bar and can be saved as bar marks on the companion server. Songs come from the companion server (scores in song folders, with upload and a "find sheet music" link to MuseScore), the local library, examples or a file. Input per player: MIDI, microphone or computer keys. Fullscreen with landscape lock. Replaces the OpenSheetMusicDisplay view and its mixer/settings dialogs.
- **Melodiq Notes**: the 502-line `useMelodiqNotesState` hook is split into focused hooks (`useSongSource`, `useSongLibrary`, `useMixerState`, `useViewPreferences`, `usePlayerInput`, `useMicPitch`, `usePlaybackEngine`) and pure, tested logic (`logic/songSource.ts`, `logic/playbackTiming.ts`, `logic/ensembleMix.ts`); it now returns state grouped by concern. The loaded song is one `SongSource` union (demo / library / upload), so an uploaded file no longer plays the previous demo's stems or shows its artist, and the demo list no longer highlights a demo while another song is loaded.
- **Storyteller players**: same flow as GuessArt — all players start on the creating device, sharing a link invites, opening it takes the seat on that phone, the host sees "… joined", and turn notifications follow `turnDelivery`; regenerating the ntfy topic no longer drops your own players. Every local player gets this device's notification channels (before only the first one). The share dialogs of both games show each player as "Dieses Gerät", "Eingeladen" or "Beigetreten". Both games share the seat code (`createSeatedAssignment`, `useSeatUpkeep`, `mergeSnapshotPlayers`, `joinSeatFromLink`); the unused `mergePlayerProfiles` / `hasPlayerChannelUpdates` are gone (#467).
- **Spieltisch**: the tabletop lobby is now the place for all table games — card and board games, the dice games (Kniffel, Knister, Qwixx; moved out of the hub) and imported games. Tapping a game asks "Ein Gerät für alle" or "Jeder am eigenen Gerät" (games with one mode open directly); the latter opens the party lobby with the game already chosen and a "Jetzt starten" button for the host, instead of dropping the choice. Texts are translated (de/en) (#467).
- **GuessArt players**: all players start local on the creating device; sharing a player's link or QR code marks them remote (invited), opening the link takes the seat on that phone, and the host sees "… joined" (also as a notification when the app is in the background). Whether a player is local now comes from the seat in the synced game, not from per-device lists or the ntfy topic — regenerating the ntfy topic no longer drops your own players. Turn notifications follow one rule (`turnDelivery.ts`) (#416).
- **GuessArt**: word selection and hint rules are pure transitions (`buildRoundTranslations`, `applyWordSelection`, `applyHint` in `logic/transitions.ts`, tested); the engine only loads and saves. The duplicated translation normalisation is one helper now (#416).
- **Storage**: companion, signaling and push settings moved out of `src/lib/storage.ts` into `lib/companion/companionSettings.ts`, `lib/webrtc/signalingSettings.ts` and `lib/push/pushSettings.ts`; `storage.*` keeps `@deprecated` delegates, behaviour unchanged (#419).
- **Party lobby**: `PartyLobby.tsx` split into section components (`PartyActiveGameBanner`, `PartyRoomHeader`, `PartyServerInfoCard`, `PartyShareCard`, `PartyPlayerRoster`, `PartyGameSelection`); 539 → 96 lines, budget baseline removed (#359).
- **Tabletop privacy**: cards in a player's hand no longer travel readable to every device. The host sends them face-down and encrypts the real faces per seat (ECDH + AES-GCM over WebCrypto); only that seat's phone can restore them (#449).
- **Tabletop presentation**: widgets glide to new positions (moves from other devices, holder layouts, undo) and cards flip with a short animation; both respect "reduce motion" (#449).
- **Tabletop Workshop import**: errors are translated (de/en) and carry a code (`WorkshopError`); without the companion server the import now explains that Steam details need the server and points to uploading the mod `.json` instead of failing with an HTML parse error (#449).
- **Tabletop TTS import**: `Bag` / `Infinite_Bag` become real bags (new `BagWidgetView`, tap to draw; finite bags keep their contents hidden, infinite bags clone their first object), `Custom_Tile` keeps its shape (box, hex, circle, rounded), `FogOfWarTrigger` becomes a hidden zone for its seat. Before, bags were imported as card decks and the bag logic was unused (#449).
- **Tabletop sync**: moves, draws, rolls, counters and all other table actions from phones now reach the host and every device. Phones send their actions as intents; the host (TV) applies them and broadcasts only the changed widgets with a sequence number, and a device that misses an update fetches a fresh snapshot. Before, only "return to lobby" and card flicks were sent and devices drifted apart (#449).
- **Self-hosting**: the compose generator in the server settings no longer emits the non-existent `tabletop-companion` and `galaxy-push-relay` images; it creates one companion container with `PLUGINS` for the selected games next to the signaling tracker. `server/docker-compose.yml` drops the commented tabletop container (#342).
- **Melodiq Notes**: the soundfont provider select and custom URL field are one component (`SoundfontProviderFields.tsx`) used by the in-game sound settings and the settings page; the settings page looks the same (#426).
- **Melodiq Notes**: the mixer, song-select and sound-settings dialogs share `NotesDialogFrame.tsx` (frame, title, close button) instead of three copies (#426).
- **GuessArt / Storyteller**: which lobby players are local to the creating device is decided by `localPlayerIdsForDevice` in `src/modules/player-management/playerLogic.ts` (tested) instead of two copies (#426).
- **Sudoku / Wordle**: the result dialogs share via `useShareOrCopy` (`src/modules/sharing`) instead of two copies of the share-or-clipboard code; the "copied" timer is now cleared on unmount (#426).
- **Melodiq**: local and phone latency calibration share one panel (`LatencyCalibratorPanel.tsx`) and one beep detector (`components/hooks/detectBeep.ts`); the phone calibrator's labels are now translated (#426).
- **Knister / Qwixx**: both dice rollers use the shared `src/components/games/useDiceRollAnimation.ts` instead of two copies of the roll timer (#426).
- **Melodiq**: `useSessionPlayers` is split into pure roster rules (`gameplay/logic/sessionRoster.ts`, tested) and focused hooks (`useSessionOverrideSync`, `usePeerRosterSync`, `usePeerSessionMessages`, `useBroadcastSongInfo`). Phone messages are now received via `manager.on('message')` instead of overwriting `manager.onMessage`, so other listeners are no longer replaced; storage is read via `storage.getJson` and the hooks are typed without `any` (#418).
- **Tabletop**: holder layout (hand, stack, fan, grid) moved from `tabletopReducer.ts` into `src/games/tabletop/logic/holderLayout.ts` with named constants and characterisation tests; the hand re-layout write-back exists once instead of four times (#414).
- **Melodiq server**: the song download job is split into steps; yt-dlp lookup/install/spawn lives in `services/ytdlp.ts` (one install path instead of two copies, shared with `routes/usdb.ts`) and UltraStar `.txt` header handling in `services/ultrastarTxt.ts`, with tests (#413).
- **Performance**: `Hub`, `Settings` and `PartyLobby` are lazy-loaded routes (own chunks). Melodiq TV mode clears its popup-window poll on disconnect and unmount instead of only when the window closes; the host queue's BroadcastChannel is documented as page-lifetime (#427, salvaged from the closed #402 without its Sudoku/sync regressions).
- **Tabletop**: one rule decides whether a holder is a player's hand (`src/games/tabletop/logic/handHolder.ts`), replacing seven diverging copies in the reducer, hand layout, seat logic, hand dock and board filter. An explicit `isHand` flag wins; games without it are classified once on load. Seat-owned public areas ("player area", "Spielerbereich", bare `ownerSeat`) stay off the shared table but are no longer treated as hands, and ids that merely contain "hand" (e.g. `handout_pile`) are no longer hands (#410).
- **WebRTC (Melodiq)**: STUN servers are now resolved per device from `src/lib/webrtc/iceServers.ts` instead of four hardcoded lists. Defaults are Cloudflare and Twilio; Google's STUN server stays selectable but is disabled by default. Custom STUN URLs and per-server toggles are stored in `galaxy_stun_custom_urls` / `galaxy_stun_preferences`.
- Fixed missing i18n keys for guessart, tabletop and party translations.
- Refactored any to unknown in melodiqFetch.

### Refactored

- **GuessArt**: the rules of `LocalGameEngine.submitGuess` (phase guard, guess evaluation incl. exact-only from hint level 2, round completion, advancing to the next round, the empty next round) are pure functions in `src/games/guessart/logic/transitions.ts` with tests; the engine method only loads and persists (#416, slice 1).
- **Quality gates**: `check:budget` now also fails when a baseline is higher than the file, a graduated file is still listed, or a listed file was deleted; `npm run check:budget -- --update` lowers/removes such entries. `check:architecture` warns at the same 250-line limit instead of 300 (#425, resolves Q9).
- **Party lobby**: player name (`logic/playerName.ts`, key now registered as `STORAGE_KEYS.PARTY_PLAYER_NAME`), routes and share link (`logic/partyRoutes.ts`, with tests) and the lobby state (`hooks/usePartyLobbyController.ts`) moved out of `PartyLobby.tsx` (615 → 539 lines). Joining/creating the room no longer runs inside a `useState` initializer, and the auto-navigation into a running game uses the updated roster for the tabletop seat instead of the previous render's (#417).
- **Party lobby**: roster rules (host resolution, roster/score merge, presence join, host and player upsert) moved from `UniversalPartyManager` into pure functions in `src/features/party/logic/partyRoster.ts` with tests; host resolution exists once instead of in two branches (#415).
- **WebRTC (Melodiq)**: the `identify` handling (name/hue/deviceId, replacing an earlier peer of the same device, `onPeerUpdated`) existed twice in `WebRTCHostManager` — once per signaling path. It is now one `applyIdentity()` with the pure `findStalePeersByDevice()` in `src/lib/webrtc/peerRegistry.ts` (with tests) (#412).
- **Dead code**: removed `src/games/melodiq/MelodiqSettings.tsx` and `components/SettingsFeedbackForm.tsx` (no importer; the settings route uses `MelodiqSettingsCategory`) (#423).
- **Werewolf tests**: the scripts `logic/tests/verify_*.ts` never ran; their Easter Bunny, Hunter and Guardian scenarios are now Vitest tests in `logic/roleScenarios.test.ts` (#424).
- **WebRTC (Melodiq)**: tracker info hash, peer id, NDJSON decoding and the tracker URL filter are shared by host and client via `src/lib/webrtc/trackerProtocol.ts` (with tests) instead of four hand-written copies. A malformed line in a data-channel chunk no longer drops the rest of that chunk on the host; the client now also de-duplicates tracker URLs (#411).
- **Quality gates**: New per-file ESLint warning ratchet `npm run check:lint-budget` (baseline `scripts/lint-warning-baselines.json`, 516 warnings in 157 files). `lint-staged` no longer rejects files with pre-existing warnings; warnings can only decrease (#421).
- **CI**: Removed the Google Jules integration (`/jules` issue command, daily Jules audit workflow, `scripts/pipeline/jules-*.cjs`, `.github/agents/`, `.github/lenses/`, `.pipeline-memory/`). The `JULES_API_KEY*` repository secrets are no longer used.
- **CI**: Removed the Google AI agent factory (`scripts/agent-factory/`) and the optional Gemini Flash waiver in the doc-sync gate (`GEMINI_API_KEY` no longer used).
- **Architecture & Code Quality Audit**: Ratcheted down component budget baselines in `scripts/legacy-component-baselines.json`, removing deleted (`ServerAdminPanel`) and graduated (`SetupDockerTab`) components while tightening limits on shrunk components.
- **Duplication & DRY**: Extracted `FeedbackForm` into `src/components/feedback/FeedbackForm.tsx` and refactored `FeedbackDialog` and `SettingsFeedbackForm` to reuse it, eliminating duplicate feedback form UI code (Fixes #403).
- **Code Quality**: Deduplicated multiple areas of the codebase to adhere to DRY principles, including extracting a shared `shuffle` utility, optimizing component logic in `Qwixx` and `Melodiq`, and extracting the `removeFromHolderAndUpdateHand` function in `TabletopReducer`.
- **Dead Code**: Eliminated unused local storage references and docstrings in `wordle` and `melodiq`.

### Fixed

- **Melodiq Notes tab view**: guitar, bass and ukulele note heads were drawn one radius to the right of their time, so they reached the hit line about a tenth of a beat after the note sounded (around 100 ms in slow songs); they are now centred on their time like drums, keys and notation.
- **Settings language**: the notifications tab and its description show English text in the English UI (the keys `settings.notifications_tab` / `settings.notifications_relay_desc` were missing, so the German fallback was shown) (#154).
- **Melodiq lyrics**: the first syllable of a line is no longer swallowed — a finished line now makes way for the next one shortly before it starts instead of lingering into it (#441).
- **Melodiq Notes**: with 3–4 players the panel header no longer draws player, part name and score on top of each other; it measures the text and drops the part name, keyboard marker and instrument, then accuracy/combo, before anything overlaps (#483).
- **Melodiq Notes stage stutter**: the whole page no longer re-renders ten times a second while playing (only the progress strip and the learn-mode hint follow the song), notes are drawn with a halo instead of a canvas blur, canvas labels are not re-translated every frame, and the notes move on the smooth frame clock pulled towards the audio clock (phones advance the audio clock in 10–40 ms steps). Measured with the 10-track score and four players: JS for React/MUI per 8 s 1.95 s → ~0, frames over 33 ms 45 → 15.
- **Recording alignment**: the coarse alignment is fitted over ±6 s instead of ±0.8 s and the fine fit penalises tempo jumps between neighbouring bars, so it no longer catches a beat an eighth off. On "Nothing Else Matters" 91 % of snare and cymbal hits are within 50 ms (was 62 %), 3 of 99 bars with drums off (was 28).
- **Web Push sender**: a refused push now says why (the push service's status and reason, or why signing failed) instead of a bare 502, also in the sender's console; VAPID secrets pasted with a trailing newline or space work.
- **Gartic Phone**: launching it from the party lobby opened an empty page because the game had no route; `games/garticphone` is now registered (`src/App.tsx`) and host and guests land in the game (#467).
- **Melodiq Notes**: the game no longer freezes on open — header callbacks were recreated on every render and looped through `HeaderLayoutContext` ("Maximum update depth exceeded"); a superseded OSMD load no longer renders into a cleared instance ("load() needs to be called before render()").
- **Share dialogs** (GuessArt, Storyteller): marking a player remote no longer waits for the MQTT broker before updating, so the dialog does not stall when the broker is unreachable. Storyteller's `importSnapshot` stored merged players but returned the unmerged ones.
- **Party mode**: a phone's tabletop seat is now a slot the host assigns once (`assignSlots`), not the player's position in the roster list, which differed between devices and could put two phones on the same hand. The party lobby syncs through the shared `MultiChannelSyncCoordinator` instead of its own BroadcastChannel, ignores its own presence pings, and `/party` is routed once (registry) instead of twice (#467).
- **Tabletop**: seat 1 no longer gets the hand of seat 0 when both hands match the seat by index (`findPlayerHandHolder` prefers an exact owner); choosing a seat no longer renames its player to "Player".
- **Tabletop Workshop import**: without the companion server, a failing Steam lookup now always shows the "upload the .json or connect the companion server" hint (also when the host answers 405/501 or the request fails), the download uses HTTPS, and a blocked download or a file that is not a TTS save get their own translated messages instead of "Failed to fetch" or a raw TypeError.
- **GuessArt**: opening a shared player link now opens the game on the phone instead of the lobby, and no longer hangs when the MQTT broker is unreachable.
- **Companion server**: environment overrides (`SECURITY_TOKEN`/`TOKEN`, `PORT`, `MUSIC_DIR`, `DIRECTORIES`, `TABLETOP_DIR`, auto-discovered `/app/music`) were written into `config.json` whenever a setting changed, so removing the env var left the old token, port and directories active. They now apply at runtime only; identical leftovers are removed from `config.json` at start (#409).
- **Darts**: Hardened `useDartsGame` persistence against corrupted JSON storage values by using `storage.getJson` with safe structure validation and fallbacks to prevent UI crashes on mount (Fixes #386).
- **Release**: `release.yml` called `npm run package` in `server/`, which no longer existed, so server binaries and the release publish step failed. `server/` now bundles with esbuild and packages Node 24 binaries for Linux, Windows and macOS with `@yao-pkg/pkg`; the release archives also ship `scripts/align_lyrics.py`.
- **Melodiq TV**: Fixed an issue where clicking the Cast button would open a new window instead of initiating a stream to the TV because of dynamic query string mismatches.

### Security

- **Companion server**: all tabletop routes (`/api/tabletop/*`, `/tabletop/media`) now require a valid token; changing tabletop directories needs the master token or a management API key. Previously `/tabletop/media` accepted requests without a token and the directory routes were open, which allowed reading arbitrary files.
- **Companion server**: media URLs returned by `/api/songs` and `/api/tabletop/games/:id/raw` carry the caller's own token instead of the master token, so restricted API keys can no longer obtain the master token.
- Applied security audit fixes (Security & Vulnerability Auditor).
- Hardened `DOMPurify.sanitize` usage in `RulesDialog` with strict allowlists for tags and attributes.
- Hardened server routes in `relayPlugin` with explicit length constraints and type checking for POST requests.
- Pinned all dependency versions in `package.json` and `server/package.json` to fixed versions (removed caret `^` and tilde `~` modifiers) to ensure reproducible builds.
- Updated vulnerable dependencies via `npm audit fix --force`.

### Changed

- **Melodiq**: Opening the settings inside the game no longer unmounts the background views, enabling seamless background execution.
- **Melodiq**: Das Halten eines Songs öffnet nicht mehr die Einstellungen/Warteschlange.
- **Melodiq Notes**: Streamlined UI for mobile-first responsiveness. Integrated song title and settings directly into `GlobalHeader`, removed in-sheet overlay controls, compacted page HUD into a single note and score bar, and made playback controls icon-only on mobile.
- Melodiq: Limited the maximum score per track to 1000 points.
- Actions pinned to commit SHAs (Dependabot keeps them current), `persist-credentials: false`, actionlint + unit tests (`npm run test:scripts`) for Jules scripts in CI precheck; watcher isolates per-issue failures and no longer re-posts PR links.

### Added

- Declarative Jules Agents Registry: added `.github/agents/` with scheduled orchestrator workflow (`jules-audit.yml`) and runner (`jules-agent-runner.cjs`) allowing scheduled autonomous audits (e.g. security) that automatically create tracking issues and PRs.
- `npm run check:hygiene` deterministic prechecks (stray artifacts, conflict markers, JSON validity, i18n parity ratchet, secret patterns, workflow permissions) as first CI job; `ci.yml` now has `permissions`, `concurrency`, fork-safe deploy; removed tracked `.orig`/`.diff` leftovers.

### Changed

- Melodiq: Limited the maximum score per track to 1000 points.
- Jules pipeline reduced to minimal `/jules` trigger (`jules-start.yml`) plus cron watcher (`jules-watch.yml`); removed lens, reviewer, auto-fixer and suggestions workflows.
- Jules key rotation via `JULES_API_KEY_*` secrets; watcher only polls issues labeled `jules:active`.

### Changed

- Melodiq: Limited the maximum score per track to 1000 points.
- Decoupled Cloudflare preview deployments from CI tests to speed up review previews.

### Changed

- Deduplicated queue participant logic in Melodiq game and removed `any` types from song downloader.
- Resolved 23 i18n translation parity gaps across tabletop, guessart, and party modules.

## [Unreleased]

### Added

- **Testing Suite**: Added comprehensive test coverage for MQTT mailbox network sync, addressing edge-cases (JSON parsing, LZString decompression), error paths (broker failover handling), and race conditions in cross-channel synchronization (Fixes #350).

### Fixed

- **GuessArt**: Fixed a "Cannot read properties of undefined (reading 'ReactCurrentOwner')" error during drawing turns by updating `@excalidraw/excalidraw` to version `0.18.1` for React 19 compatibility.

### Added

- Pre-commit hooks for running quality gates automatically before committing locally.

### Added

- **Kniffel**: Added the classic dice game Kniffel to the local game galaxy. Players can roll 5 dice up to 3 times, score in 13 categories across upper and lower sections, and compete for the highest score. Implements full offline persistence and German/English localization.

# Changelog

All notable changes to **LocalGameGalaxy** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- **Melodiq**: Phone client correctly utilizes WebRTC passthrough to access the Host's song library directly instead of failing due to a missing local helper configuration (Fixes #248).
- Core: Migrated direct `localStorage` and `sessionStorage` calls in Melodiq to the unified `storage.ts` service with typed constants (`STORAGE_KEYS`), enforcing the zero raw storage policy and resolving Dependency Inversion Principle (DIP) violations.

### Fixed

- **Melodiq**: Fixed an issue where the YouTube background video would go permanently out of sync (delayed) by correcting the soft drift tolerance threshold and seek cooldown rate limits.

### Added

- Dart Checker game for tracking scores in 301, 501, and Count Up modes.
- **Documentation**: Added `docs/tech/pipeline-quality-gates.md` documenting our deterministic tools strategy (eslint, tsc, component budget, jscpd, and architecture checks). Also updated `docs/tech/architecture.md`.
- **CI/CD**: Added a fully functional `.gitlab-ci.yml` pipeline with security gates (SAST, Secret-Detection, npm audit), and integrated `npm run check:security` into the GitHub Actions CI pipeline.
- **Documentation (OKF v0.2)**: Converted technical documentation into an Open Knowledge Format (OKF) v0.2 Knowledge Bundle with root `index.md`, `log.md`, and typed frontmatter. Brought `docs/tech/architecture.md` and related tech docs up to date with the current codebase (all 13 games, shared modules, Hono micro-kernel, Cloudflare Quick Tunnel, and segregated layout contexts).
- **Melodiq**: Fixed an issue where the "Back" button was broken when exiting the settings view during a game by properly memoizing the exit callback to prevent unstable reference loops with the GlobalHeader state.
- **Settings**: Extracted GitHub issue submission logic and Server proxy feedback logic from `FeedbackDialog` and `SettingsFeedbackForm` components into a single `submitFeedback` function within `src/lib/github.ts` to fix a Separation of Concerns violation.
- Fixed GuessArt game redirect URLs (#126)
- Fixed Excalidraw library loading from local storage (#126)
- **All Games**: Created a standardized `GameLayout` component to ensure scrollbars are rendered at the window's edge. Implemented in Wordle, Sudoku, Qwixx, Melodiq Notes, Knister, and Cards (Fixes #199).
- Melodiq Notes: Fixed an issue where the user could not scroll vertically on the game screen by adding CSS properties `height: 100%`, `overflowY: auto`, and `WebkitOverflowScrolling: touch` to the main container component (Fixes #196).

### Fixed

- **Code Health**: Removed unused dummy cache functions (`getCachedFiles`, `setCachedFiles`, `clearFileCache`) from Melodiq's database and media loaders.

- Scanner: Replaced blocking synchronous file IO (`fs.readFileSync`, `fs.existsSync`, `fs.readdirSync`) with asynchronous equivalents in `parseSongFile` for vastly improved event loop performance.
- Melodiq: Fixed an issue where the PitchVisualizer animation loop would occasionally access stale `currentPitchRef` and `sungSegmentsRef` values by switching `useEffect` to `useLayoutEffect`.
- Tabletop: Fixed an HTML injection vulnerability in tabletop game rules dialog using DOMPurify.
- Melodiq Notes: Fixed an issue where the user could not scroll vertically on the game screen by adding CSS properties `height: 100%`, `overflowY: auto`, and `WebkitOverflowScrolling: touch` to the main container component (Fixes #196).
- GuessArt: Fixed an issue where the prefilled hint letters would persist in the input bar even after transitioning to hint stage 2, causing them to be duplicated and not correctly matched against the newly revealed hint letter pool (Fixes #140).

### Fixed

- **Code Health**: Fixed eslint-disable exhaustive-deps in MelodiqSettings.

### Added

- **Cloudflare Preview Cleanup Pipeline**: Automated deletion of preview branches & deployments on Cloudflare upon PR merge or closure (`.github/workflows/cleanup-preview.yml`) and manual `workflow_dispatch` trigger to purge all historical preview deployments.
- **Melodiq Notes UX & Multi-Stem Audio Player**: Responsive mobile sheet music layout, collapsible settings accordion, fixed bottom action bar, and synchronized multi-stem Web Audio playback (#132, PR #189).

- **AI Issue Curator & Deduplication Pipeline**: Automated issue clustering, duplicate detection, and 1-click issue bundling via `/curate`, `/bundle`, and `/duplicate` slash commands and GitHub labels (`curate`, `bundle`, `duplicate`, `plan`, `approved`).
- **Google Jules & Gemini 3.8 Multi-Key Pool**: Cloud-native execution with multi-account rotation across 5 Google AI Pro accounts (`JULES_API_KEY_1..5`).
- **RepoLens Lens Integration**: Specialized audit lenses for code duplication, architecture, i18n, and UX directly integrated into Jules tasks (`scripts/jules-lens-resolver.mjs`).
- **Melodiq Notes (Instrument Practice)**: Complete sheet music viewer with OSMD, MusicXML parsing, Web Audio multi-stem player, and MIDI note verification (`src/games/melodiq-notes/`).
- **Generalized Cards Suite**: Universal score and lives tracker (`UniversalScoreView.tsx`, `ModernScoreAdjuster.tsx`) in `src/games/cards/`.

### Changed

- Melodiq: Limited the maximum score per track to 1000 points.
- Refactored CI quality gates to enforce zero-duplication (`jscpd` < 2.5%), anti-god-component budget (< 250 lines), and doc synchronization.

### Fixed

- **Jules Plan Generator**: Jules implementation plan generation has been upgraded to the RepoLens RFC Research Plan standard (as seen in RepoLens #389), featuring real code snippets, git history context, line-level citations, alternatives analysis, and concrete Vitest test plans.
- **Self-Improving Pipeline Memory**: Added `.pipeline-memory/` persistence allowing the plan generator to learn domain aliases, subsystem component topologies, and resolution patterns dynamically across runs.
- **Generic Codebase Introspector**: Upgraded scanner to dynamically discover all games and modules, matching AST symbols, state hooks, and exact line citations to guarantee zero generic placeholders.

### Removed

- **Repository Bloat & Heap Snapshots**: Purged 55+ MB of legacy memory dumps (`baseline.heapsnapshot`, `target.heapsnapshot`), debug logs (`diff.txt`, `lint_output.txt`), and scratch test files from repository root.
- **Obsolete Python Scripts**: Deleted 10 legacy migration scripts (`scripts/fix_*.py`, `scripts/patch_*.py`, `scripts/update_i18n*.py`).
- **Legacy Pipeline Fallbacks**: Decoupled Jules agent execution keys from Gemini API callers, eliminating redundant 403 authorization failures on Google Cloud.

---

## [1.1.0] - 2026-09-02

### Added

- Multi-game party suite with WebRTC local peer discovery and MQTT relay fallback.
- Support for Werewolf, Gartic Phone, Storyteller, Tabletop, Sudoku, Knister, Qwixx, and Wordle.

## [Unreleased]

- Core: Migrated direct `localStorage` and `sessionStorage` calls in Melodiq to the unified `storage.ts` service with typed constants (`STORAGE_KEYS`), enforcing the zero raw storage policy and resolving Dependency Inversion Principle (DIP) violations.

### Refactored

- `ServerAdminPanel`: Decomposed into smaller sub-components and extracted state into `useServerApiKeys` custom hook to resolve Separation of Concerns and God Component size violations.

## [Unreleased]

### Refactored

- Deduplicated `guessart` and `storyteller` core primitives by extracting pure IndexedDB operations into `src/modules/async-game`, round-robin player assignment logic into `src/lib/utils/turnAssignment.ts`, and sharing dialogs logic via `useSessionSharing` into `src/modules/sharing`.
