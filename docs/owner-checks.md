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
