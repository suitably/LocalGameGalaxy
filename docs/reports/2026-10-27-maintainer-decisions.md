---
type: Report
title: 'Maintainer decisions on open issues (2026-10-27)'
description: 'Answers the maintainer gave on 2026-10-27 to the decisions blocking open issues (push relay, release pipeline, supply chain, changelog fragments, tabletop secrecy and templates, drum lanes, Wordle dictionary, one song folder), so implementing agents do not ask again.'
tags: [decisions, release, ci, tabletop, melodiq, melodiq-notes, wordle]
status: stable
generated:
  at: 2026-10-27T10:00:00+01:00
  by: claude-code
verified:
  at: 2026-10-27
  method: 'Answers recorded verbatim from the maintainer in the session that produced PR #603; issue texts read via the GitHub API.'
sources:
  - 'GitHub issues #547, #549, #551, #553, #565, #568, #571, #587, #590, #592, #593, #595'
---

# Maintainer decisions on open issues (2026-10-27)

Implementing agents: take these as settled. Paste the matching lines into the "Decisions" slot of an issue's agent prompt.

| Issue                        | Decision                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #587 push relay keys         | Without VAPID secrets and without KV, Web Push is off: `/vapid-public-key` answers 503 and only ntfy is delivered. No per-isolate keys. Implemented in #603.                                                                                                                                                                                       |
| #553 Notes sound settings    | Reuse `SoundSettingsSection`. One implementation; the small change in order and labels is fine.                                                                                                                                                                                                                                                    |
| #590 release without secrets | A tag release without the Android keystore fails and is not published. Manual runs may build `nexumia-debug.apk`, which is never attached to a public release. Missing Docker Hub or Cloudflare secrets fail the run in `suitably/LocalGameGalaxy`; forks keep skipping with a notice.                                                             |
| #551 hidden zones (Q16)      | Both: close the UI leaks, and have the host redact hidden widgets per seat in deltas and snapshots.                                                                                                                                                                                                                                                |
| #547 local templates (Q19)   | Local templates go in a separate store keyed by game id, with "reset to original".                                                                                                                                                                                                                                                                 |
| #592 supply chain            | The production-dependency audit (high/critical) blocks tag releases only and stays advisory on PRs. Accepted advisories go in an allow-list with reason and expiry. Images go to Docker Hub **and** GHCR, both with provenance.                                                                                                                    |
| #593 changelog fragments     | The version comes from the fragment types (semver: `added` → minor, `fixed` → patch), with a manual override. `docs/log.md` moves to fragments too. The maintainer still has to create the `RELEASE_TOKEN` secret.                                                                                                                                 |
| #595 nightly channel         | Not wanted: PR previews cover the web app, and native parts are tested at release time. Close the issue.                                                                                                                                                                                                                                           |
| #571 drum lanes              | Percussion (tambourine, cowbell, clap …) gets its own lane that is shown and audible but not judged. Toms 1/2/3 and the floor tom get real, judged lanes. Still open: lane order and keys, and how many pads fit on the pult.                                                                                                                      |
| #549 Wordle dictionary       | Hunspell-derived lists: German from igerman98 (GPL, compatible with AGPL), English from SCOWL. The 5-letter words are extracted at build time and loaded as a lazy, offline chunk.                                                                                                                                                                 |
| #565 / #568 one song folder  | (1) The song folder becomes the only store; this reverses Q18. (2) A song without a `.txt` is identified by an id stored in `song.json`. (3) `/api/notes/pieces…` and the deprecated `/api/songs/:id/scores` routes are replaced right away; clients switch in the same PR. (4) Notes' own recordings live in the song folder as additional audio. |
| Q17 Docker Hub               | The account behind `DOCKERHUB_USERNAME` owns the `nexumia` namespace. Stop publishing `nexumia/melodiq-server` with 1.2.0.                                                                                                                                                                                                                         |
