## 2026-11-23 — Coverage measurement and logic/ ratchet (agent)

- `docs/tech/testing-guide.md` §2: `npm run test:coverage`, `npm run check:coverage`, ratchet rules.
- `docs/tech/pipeline-quality-gates.md`: new "Test Coverage" section (separate GitHub job outside `ci-ok`, GitLab `ci:gates`).
- `docs/workflows/ci-cd-pipelines.md`: coverage job listed.
- `AGENTS.md` §8: coverage commands.
- Tooling only (`vite.config.ts` coverage block, `scripts/check-coverage.mjs`); no production code changed.
