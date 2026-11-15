## 2026-11-15 — Q6: dead imposter.json locale files removed (claude-code)

- `docs/open-questions.md`: Q6 resolved (maintainer decision 2026-11-15), recorded under "Resolved 2026-11-15".
- `docs/tech/i18n-strategy.md` §3: dropped the note about the unused `imposter.json` files.
- Outside `docs/`: deleted `src/i18n/locales/{de,en}/imposter.json` (legacy word/hint lists, superseded by `src/games/imposter/logic/wordPairs_*.ts`).
