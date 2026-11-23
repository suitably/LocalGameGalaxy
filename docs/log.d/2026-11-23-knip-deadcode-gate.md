## 2026-11-23 — knip dead-code ratchet documented (agent)

- `docs/tech/pipeline-quality-gates.md`, `AGENTS.md` §8: new `check:deadcode` gate (knip, `knip.json`, `scripts/deadcode-baselines.json`), separate non-required GitHub job.
- `docs/tech/architecture.md` §3: `useLayoutContext` alias removed from `layoutContextCore.ts`.
- Code outside `docs/` changed (`knip.json`, `scripts/check-deadcode.mjs`, imposter word-pair default exports removed).
