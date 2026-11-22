---
type: Howto
title: 'Owner checks — what only the maintainer can do'
description: 'Short checklists for closed issues whose last steps need a real device or TV, an account, a secret or an upstream release; agents did everything else and never ran these checks.'
tags: [owner, manual-checks, devices, upstream, backlog]
status: stable
generated:
  at: 2026-11-22T12:00:00+01:00
  by: claude-code
verified:
  at: 2026-11-22
  method: 'Collected while closing the open issues on 2026-11-22; each entry names the issue and what was done without the device, account or upstream project'
sources:
  - 'https://github.com/suitably/LocalGameGalaxy/issues'
---

# Owner checks

Each section belongs to a closed issue. Everything that works without a device, an account, a secret or an upstream release is done in code, tests and docs; the boxes below were **not** run by an agent. Tick a box (or delete the section) when done; open a new issue if a check fails.

## #665 — TypeScript 7 for the root package (upstream)

Blocked upstream: `npm view typescript-eslint peerDependencies` on 2026-11-22 still says `typescript >=4.8.4 <6.1.0` while `typescript` is at 7.0.2. Nothing can be done in this repository before that changes.

- [ ] When a `typescript-eslint` release accepts TS 7, bump the root `typescript` to 7.x (and `typescript-eslint`), keep `tsconfig` strictness, and run `npm run ci:gates && npm run build`; `check:lint-budget` must not rise.
- [ ] Pitfalls from #616: `server/` already pins TS 7.0.2 while ESLint uses the root TS; `tsc -b` writes `tsBuildInfoFile` under `node_modules/.tmp/`; tools on the TS JS API (`ts-api-utils`).

## #661 — real-device round of the party games

Only browser contexts were tested (`npm run e2e:multiplayer`). Decisions for the other points: [ADR-0008](adr/0008-party-lobby-leftovers.md).

- [ ] Play one full round of each party game from the lobby on real phones (Gartic Phone, GuessArt, Storyteller, Imposter/Werewolf if in the lobby, tabletop, Melodiq with phones as microphones) and note any failure in a new issue.
- [ ] Start Melodiq from the hub and pair a phone via the QR code (hub pairing screen kept by ADR-0008).

## #699 — Melodiq Notes leaderboard on the pults, colour-blind palette

Results model, stage leaderboard (#760), pult leaderboard and the palette are in code with tests.

- [ ] Play a song in perform mode with phones joined: at the end each phone shows the leaderboard with its own row marked; loading another song clears it; a phone joining between songs still sees it.
- [ ] The judgement glyphs (★ ● ✓ ✕ ▲) render (no empty boxes) on Android WebView, a TV browser and iOS.
- [ ] With the colour-blind palette on, check the colours on a TV (yellow "good" on the dark stage) and that the ✕ under missed notes does not collide with ledger lines or syllables.

## #703 — sharing tabletop games without GitHub PRs

The PR path is removed; sharing is the Share menu (export `.pcio` / `.json`, save to the companion). Round-trip tests cover the exporter. Third-party (`tts-workshop`) games cannot be exported (ADR-0005 D4); saving them to the companion stays allowed.

- [ ] Export `.pcio` and `.json` from the Share menu on desktop and in the Android app (blob download in the WebView), then import both on a second device.
- [ ] With a companion connected, Share → "Save to server" and see the game on another client.
- [ ] On a Steam Workshop import, both exports are disabled with the blocked text, and saving to the server still works.

## #571 — Melodiq Notes drum lanes

Lanes, keys, judging and the percussion setting are in code with tests ([ADR-0007](adr/0007-melodiq-notes-drum-lanes.md)).

- [ ] On a real e-drum kit, toms land on the intended lanes (Roland sends 45 for tom 2, which maps to the tom 3 lane, and 39 for tom 4 rim, which maps to percussion; a per-kit mapping may be needed); hi-hat edge 22/26 and tom 3 rim 58 behave as expected.
- [ ] With 7–8 lanes on a laptop/TV, lane width and the hollow (open) vs filled (closed) hi-hat are readable; tom colours on the phone pult's single tom pad are readable.
- [ ] Synth tom pitches and the percussion sound are distinguishable; display-only percussion is audible in "others" band mode.

## #662 — end-to-end encrypted MQTT rooms

Envelope, keys, retain policy and link handling are in code with fake-broker tests ([ADR-0009](adr/0009-mqtt-end-to-end-encryption.md)). `npm run e2e:multiplayer` ran on 2026-11-22 against a local MQTT-over-WebSocket broker (`MQTT_RELAY=ws://localhost:1884`, aedes): 20 of 21 scenarios passed; the one failure ("garticphone: watching host … lobby visits", no back-to-lobby button found) and the "back to lobby" SKIPs happen on `main` too, so they are not caused by encryption.

- [ ] Run `npm run e2e:multiplayer` once against the public brokers (blocked from the cloud sessions).
- [ ] On real phones: the invite link / QR carries `#…key=…`, a guest joins and plays a room game; `/party?room=<CODE>` without the key shows the encrypted-room hint; a Melodiq phone QR from the lobby still connects; a GuessArt/Storyteller "play over days" link (full and short QR) loads the game.
- [ ] Review the new privacy text in `public/datenschutz.html` / `public/privacy.html`.
- [ ] Decide when to drop the plaintext fallback for key-less rooms (planned for a later release in ADR-0009).

## #557 — view requests and card offers between hands

State machine, authorization and sealed reveal are tested (`logic/__tests__/handRequests.test.ts`); the UI is type-checked and linted only.

- [ ] With 3 phones + host on an HTTPS origin: A asks B for specific cards and for N random cards; only A sees the faces (C and the TV keep backs), the faces revert after A closes the result; extending, reducing and withdrawing a pending ask updates B's notice; two requesters to B are answered separately.
- [ ] Offers: a chosen-card offer that is taken moves the cards face up into the receiver's hand only; a rejected random offer leaves them with the giver, who sees the rejection.
- [ ] Spectators have no request button; in local pass-and-play nothing shows over the handover cover; dialog and notices fit a 390 px phone.

## #563 / #564 — Melodiq Notes: scores per song, labels, hidden and renamed parts

Server routes (`POST /api/songs/:id/files` with `label`, `POST /api/songs/:id/merge`, `POST /api/notes/library/rescan`, `PUT /api/songs/:id/scores/:file/parts`) are covered by `server/test/song_library_links.test.js`; client logic by unit tests.

- [ ] With a companion server: "Save to Notes library" pre-selects the same-named song; a given name appears as the score label; "New song" creates a separate folder.
- [ ] "Move into another song…" moves scores, marks and labels into a Melodiq song and the source entry disappears; "Re-scan library" shows a folder added on disk without a restart.
- [ ] On the stage, a hidden part gets no player, is not offered on a joined phone and lowers the track count; "Synth backing" makes it audible in band mode Others/All (muted by default); a renamed part shows its name on stage and pult; both survive reloading the score.

## #604 — Melodiq sings from `ScoreSong`

Parity tests (solo, duet, golden, freestyle, rap fixtures) show identical notes, line breaks and scores through the old and new path; score-only songs are listed (`/api/songs?all=1`) and sing from the first score with a vocal part.

- [ ] With a companion server, sing a karaoke song with a `.txt` (solo and duet) and compare the score with an earlier run.
- [ ] Sing a song that has only a MusicXML with a lyric vocal part (+ bar marks): lyrics and pitch follow the mix. A phone that loads such a song needs its own companion connection (it fetches the score directly).

## #594 — REUSE and dependency licences

`reuse lint` (REUSE 3.3) passes for all files and `npm run check:licences` allows every production dependency of root, `server/` and `signaling/`; release archives get `THIRD_PARTY_LICENSES.txt`.

- [ ] Answer Q25 in `docs/open-questions.md`: the real copyright holder line for own files (today `REUSE.toml` uses "LocalGameGalaxy", the only author wording in the repo) and confirm the brand/icon PNGs are own work.
- [ ] After the next release, open a server archive and check `THIRD_PARTY_LICENSES.txt` and `LICENSE` are inside.

## #634 — guitar strum direction

Rhythm rule, file marks (MusicXML bow marks, Guitar Pro `PickStroke`/`Brush`, tested with a hand-written GPIF) and per-part / per-bar overrides in `song.json` are tested.

- [ ] Load a real Guitar Pro file with pick-stroke marks and a MusicXML with bow marks: the arrows above the strums follow the file; a strummed song without marks shows down on beats, up on offbeats.
- [ ] Set "all down" and a per-bar override in the Parts dialog; both survive a reload of the song folder score.

## #636 — Melodiq song library

Grouping, filtering, store selection and the companion routes are tested (`test/melodiq_song_library.test.js`); the UI was not run in a browser by an agent ([ADR-0010](adr/0010-melodiq-song-library.md)).

- [ ] On a phone and a TV: the tabs All / Artists / Albums / Favourites / Playlists, search across tabs, the favourite heart and add-to-playlist work.
- [ ] With two API keys on the companion: a shared playlist is visible but read-only for the other user, a private one is invisible; legacy `playlists.json` lists appear once after the update (the old `/api/playlists` routes are gone, so older app versions lose playlist sync).
- [ ] With a local folder instead of the server, favourites and playlists stay on the device.

## #467 — one table session for all table games

Slice 3 (Spieltisch with mode picker) was already on `main`; slices 4 (dice games on one device), 5 (Kniffel/Qwixx with everyone on their own device) and 7 (390 × 844 layout pass with browser screenshots) are in code with tests. Two-page Playwright runs in one browser covered lobby, start, follow, roll and status.

- [ ] From the party lobby with 3 real phones over MQTT: Kniffel and Qwixx — the right player rolls and scores, Qwixx "Fertig" passes the roll on, a row closed by one player locks on every sheet, the game end shows everywhere; a phone reloaded mid-game keeps its Qwixx sheet.
- [ ] One device: Knister with 3 players (cover after each placement, a typed-in number becomes everyone's roll), Kniffel cover after each score, Qwixx with 2+ names ("fertig", cover, new game clears all sheets).
- [ ] Lobby on a 360 px Android phone and an iPhone with a notch: leave and "fertig" buttons clear the home indicator.
