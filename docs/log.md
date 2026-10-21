# Log

Changes to this bundle, newest first. Format: `## YYYY-MM-DD — summary (agent)`, then bullets. Say whether code or configuration outside `docs/` changed.

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
