## 2026-11-16 — Games clean-up: werewolf architecture tree, Sudoku i18n source (claude-code)

- `docs/tech/werewolf-architecture.md`: replaced the component tree in section 2 (it listed Screen files that no longer exist) with the files under `src/games/werewolf/components`, checked with `ls` and `grep`; bumped `verified`.
- `docs/tech/i18n-strategy.md`: Sudoku's dead `i18n` bundle was deleted (its strings live in `public/locales`, plus the two share keys added there), so Sudoku moved to the locales row; Wordle moved there too, since its `wordleTranslations` bundle is never imported; bumped `verified`.
- `docs/open-questions.md`: added Q23 (Wordle's unregistered bundle).
