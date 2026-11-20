## 2026-11-20 — Task index refreshed, finished specs archived (claude-code)

- `docs/tasks/index.md`: status checked 2026-11-20 against the GitHub API (#356, #359, #360, #539, #647 all closed as completed); only the SOLID-13 spec (`any` in Melodiq, still about 90 sites in `src/games/melodiq`) stays open.
- Moved to `docs/archive/issue-specs/`: ISSUE-356, 359, 360, 539, 647 and SETTINGS-unification (its `settingsRoutes.ts`, `src/components/settings/`, `useStoredSettings.ts` and registry settings sections exist on `main`); ISSUE-647, ISSUE-539 and SETTINGS-unification set to `status: deprecated`; their relative links adjusted.
- Moved ISSUE-SOLID-14 to `docs/archive/solid-tasks/` (none of the `any` sites it lists remains in code; it has no issue number).
- Fixed inbound links in `docs/workflows/multi-agent-token-strategy.md`, `docs/reports/2026-10-26-settings-unification-plan.md` and `docs/archive/solid-tasks/ISSUE-SOLID-17-…md`; `docs/archive/index.md` lists the new batch.
- No code outside `docs/` changed.
