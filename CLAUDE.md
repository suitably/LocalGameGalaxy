# LocalGameGalaxy — Claude Code entry point

@AGENTS.md

## Session start

Keep context small — load docs on demand, not up front.

1. Questions and trivial fixes: go straight to the code. For changes, follow AGENTS.md §1 (one doc for your area, grep instead of whole-file reads).
2. Check overlapping work: `git status`, open PRs. Do not commit to `main`.

## Commands

| Task                       | Command                                                                      |
| -------------------------- | ---------------------------------------------------------------------------- |
| Dev server                 | `npm run dev` (Vite, http://localhost:5173)                                  |
| Companion server / tracker | `npm run host` (needs `cd server && npm run build` first), `npm run tracker` |
| Quick gate after changes   | `npm run quality-gates`                                                      |
| Full CI parity             | `npm run ci:gates && npm run build`                                          |
| Server tests               | `cd server && npm run build && npm test`                                     |
| One test file              | `npx vitest run src/path/to/file.test.ts`                                    |

Run gates only after code changes, not while researching. Prefer the narrowest check (one test file, `check:architecture:diff`) and pipe long output through `tail -40`; run the full gate once before committing.

## Working rules for Claude

- Code is the source of truth. When docs and code disagree, fix the doc in the same change (front matter `verified`, entry in `docs/log.md`) or add an open question — never leave a known-wrong statement behind.
- Before naming a file, symbol, key or route in a doc, confirm it exists with `grep`.
- Keep changes to the requested scope; refactors, dependency bumps and formatting passes are separate PRs.
- Secrets: never read or print any `config.json`, `.env*` or keystore.
- Answer the user in German; write code, comments, commit messages and docs in English.
