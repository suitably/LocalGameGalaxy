## 2026-11-23 — Debug logger and no-console rule (agent)

- `docs/tech/coding-conventions.md` §2: new anti-pattern row for `console.log`/`debug`/`info` in `src`; replacement is `src/lib/logger.ts` (`createLogger`), enforced by ESLint `no-console` plus `check:lint-budget`.
- `docs/tech/architecture.md` §3.2: reuse catalogue row "Logging".
- `docs/tech/persistence.md`: `DEBUG_LOG` storage key (`lgg_debug_log`) in the App group.
- Code outside `docs/` changed (`logger.ts`, `storageCore.ts`, `eslint.config.js`, 56 `console.log` and 5 `console.debug` calls moved to the logger).
