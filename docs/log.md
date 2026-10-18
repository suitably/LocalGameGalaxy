# Log

Changes to this bundle, newest first. Format: `## YYYY-MM-DD — summary (agent)`, then bullets. Say whether code or configuration outside `docs/` changed.

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
