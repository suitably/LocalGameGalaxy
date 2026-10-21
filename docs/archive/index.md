# Archive

Completed task specs and retired tooling, kept because the reasoning may matter again. Paths inside these files describe the code **at the time of writing** and are often gone.

- [Backend simplification](backend-simplification/README.md) — 11 specs that turned the Express server into the Hono plugin server (no auto-sync, no VAPID in the server, no SSL generator, no admin UI, simplified auth, frontend config UI, File System Access lite mode, Dockerfile/compose). All implemented.
- [Tabletop engine](tabletop-engine/README.md) — TT-01…TT-08: schema + `.pcio` parser, IndexedDB manager, surface + widgets, smartphone controller, peer sync, party integration, GitHub PR publishing, built-in library. All implemented.
- [SOLID task batch](solid-tasks/README.md) — SOLID-01…12, 15, 16, 18, 19 and ISSUE-132 (cross-game imports, shared sync/drawing/sharing modules, storage migration, native dialogs, God-component splits, layout context split, i18n of connection UI). Verified done in code on 2026-10-18. Still open: SOLID-13, 14 in [tasks/](../tasks/index.md); SOLID-17 archived here as duplicate of #359.
- [Agent factory](agent-factory.md) — `scripts/agent-factory/orchestrator.mjs` worker pool of Google AI Pro accounts via `agy`. Removed 2026-10-21.
- [Jules pipeline](jules-pipeline-workflow.md) — `/jules` issue agent and the daily Jules audit (`.github/agents/`, RepoLens lens copies in `.github/lenses/`). Removed 2026-10-21.
- [Issue specs #353, #354, #355, #357, #358](issue-specs/) — SetupDockerTab split, Melodiq queue/downloader and song-view dedup, GuessArt/Storyteller dedup, i18n zero parity. Implemented via #384; issues closed 2026-10-18. #361 (WebRTC heartbeat) closed as not planned 2026-10-21.
