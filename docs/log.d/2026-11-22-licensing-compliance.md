## 2026-11-22 — Licensing: REUSE, dependency licence allow-list, source link (agent)

- `docs/tech/dependencies.md` (new): third-party files and their licences (`REUSE.toml`, `LICENSES/`), the production-dependency allow-list (`scripts/check-licences.mjs`), the server-archive notices and the in-app source-code link (#594). Linked from `docs/index.md` and `docs/tech/index.md`.
- `docs/workflows/ci-cd-pipelines.md`: precheck runs `reuse lint` and `check:licences`; release gates run `check:licences`; server archives ship `LICENSE` and `THIRD_PARTY_LICENSES.txt`.
- `docs/open-questions.md`: Q25 **[user]** copyright holder wording for own files.
- `README.md` §8: third-party exceptions now point to `REUSE.toml` and the new doc instead of the resolved Q21.
