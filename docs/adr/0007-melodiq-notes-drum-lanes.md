---
type: Architecture Decision Record
title: 'ADR-0007: Melodiq Notes drum lanes — one lane per kit piece, a percussion lane, one tom pad on the pult'
description: 'The drum highway gets lanes for cymbal, hi-hat, snare, toms 1–3, floor tom, percussion and kick, shows only the lanes a song uses, keeps percussion display-only by default and gives the phone pult four pads plus the kick; answers the maintainer questions of issue #571.'
resource: src/games/melodiq-notes/stage/logic/drumLanes.ts
tags: [adr, melodiq-notes, drums, input, pult]
status: stable
generated:
  at: 2026-11-22T12:00:00+01:00
  by: claude-code
verified:
  at: 2026-11-22
  method: 'Implemented in the same change; read src/modules/music-score/{instruments,drumVoices}.ts, stage/logic/{charts,drumLanes,keyboardInput,judging}.ts, stage/engine/{players,input}.ts, stage/render/{drumsView,geometry}.ts, pult/PultEngine.ts; tests in stage/logic/__tests__/drumLanes.test.ts and music-score/__tests__/drumVoices.test.ts.'
sources:
  - 'GitHub issue #571'
  - 'docs/reports/2026-10-27-maintainer-decisions.md'
  - 'src/modules/music-score/instruments.ts'
  - 'src/games/melodiq-notes/stage/logic/drumLanes.ts'
---

# ADR-0007: Melodiq Notes drum lanes

## Status

Accepted 2026-11-22. Records the maintainer decisions on issue #571 (2026-10-27, [maintainer decisions](../reports/2026-10-27-maintainer-decisions.md); 2026-11-07 in the issue thread) and decides the questions they left open (lane order and keys, the percussion default) by best practice, as the maintainer asked.

## Context

- The drum highway had four pad lanes plus the kick: cymbal, hi-hat, snare, one tom lane, kick (`drumLaneOf` in `src/modules/music-score/instruments.ts`). Toms 1/2/3 and the floor tom were told apart only by a glyph; tambourine (GM 54), clap (39), cowbell (56), cabasa, maracas, claves and every unknown key landed on the hi-hat lane and were judged as hi-hat.
- Open questions in #571: how many lanes and in which order, which computer keys, whether a percussion lane is judged (an e-drum kit has no tambourine pad), how many pads fit on the phone pult.
- Practice elsewhere: rhythm games (Rock Band / Clone Hero "pro drums") keep four pads plus kick and colour the toms; e-drum trainers (DTX-style) give every kit piece its own lane in kit order, with MIDI as the real input.

## Decision

Maintainer decisions (2026-10-27, 2026-11-07):

1. **Percussion has its own lane**, shown and audible (tambourine, cowbell, clap, shaker …; `DRUM_PERCUSSION_LANE`). Whether it is judged is a user setting; keys and MIDI notes are mapped automatically as before (General MIDI).
2. **Toms 1, 2, 3 and the floor tom have real, judged lanes** on the stage, so a fill moves across the kit.
3. **The phone pult keeps one tom pad** and tells the toms apart by colour.
4. **Only the lanes a song uses are shown**; there is no "simple / full" layout toggle.
5. **Lane order** left to right: cymbal, hi-hat, snare, tom 1, tom 2, tom 3, floor tom, percussion, kick (`DRUM_LANES`; the kick stays the bar across all lanes). MIDI is the primary input once seven or more lanes are in play.
6. **Colours and fills over text glyphs**: each lane has its own colour (toms green, teal, purple, pink; percussion muted grey); a closed hi-hat is a filled note, an open one hollow; display-only percussion is drawn faint.

Decided here by best practice:

7. **Percussion defaults to display-only** (a learn lane): drawn, played along by the band synth (also when the band plays only the other parts), never judged and never counted in score or accuracy. Rationale: e-kits and trainers have no tambourine pad, so judging it by default would punish every drummer with misses they cannot avoid. The setting "Judge the percussion lane" (stage players sheet, `STORAGE_KEYS.MELODIQ_NOTES_JUDGE_PERCUSSION`) turns judging on for players on the stage screen.
8. **Computer keys extend the existing row**: D cymbal, F hi-hat, J snare, Space kick stay; the tom keys K, L, ; and ' (QWERTZ: K L Ö Ä) play the shown toms from left to right, so a song with only two toms still uses K and L; G plays percussion. Keys are physical codes (`KeyboardEvent.code`), as before.
9. **Pult: four pads plus the kick** (cymbal, hi-hat, snare, one tom pad, kick) and no percussion lane: the pult leaves percussion out (the stage shows it and its band plays it), so pult seats never judge percussion, also on the stage that merges their judgements.
10. **Non-kit voices**: tambourine keeps its own voice (`tambourine`, GM 54, names tambourine/Tamburin); every other non-kit sound is the generic percussion voice `other` (clap, cabasa, maracas, claves, shaker, unknown keys), never the hi-hat. The name `other` stays for compatibility with stored and parsed scores. Roland V-Drums keys outside GM (22/26 hi-hat edge, 58 tom 3 rim) are mapped to their kit lanes.

## Alternatives considered

- **Keep four pads plus kick everywhere, toms by colour only** (Rock Band style): simplest, fits phones, but the maintainer wants real tom lanes on the stage.
- **A fixed full-kit layout with a "Simple / Full kit" toggle**: superseded by decision 4 (show the lanes a song uses).
- **Percussion judged by default**: rejected (decision 7); no e-kit pad to play it on.
- **Fixed keys per tom lane** (K always tom 1, L always tom 2 …): a song with only a floor tom would need the far-right key; positional tom keys keep the hands on the home row.

## Consequences

**Positive**: drum charts read like the kit; fills and percussion no longer pass for hi-hat hits; songs with few drums keep a compact highway; the pult layout is unchanged for players.

**Negative**: up to eight pad lanes on a laptop screen are narrow, so MIDI is the realistic input there; GM key mapping cannot match every kit's tom assignment (for example Roland's default tom 2 is GM 45, a tom 3 lane, and tom 4 rim sends 39, which GM calls hand clap). Lane indices changed (kick is now 8), so code that hard-coded lane numbers was updated.

**Follow-up**: per-kit MIDI mapping (learn a kit's keys) if real kits disagree with GM; the notation view still draws only the judged notes, not display-only percussion.
