# LocalGameGalaxy — Claude Code entry point

@AGENTS.md

## Session start

Keep context small — load docs on demand, not up front.

1. Questions and trivial fixes: go straight to the code. For changes, follow AGENTS.md §1 (one doc for your area, grep instead of whole-file reads).
2. Multi-file tasks: decide inline vs. subagents per [docs/workflows/multi-agent-token-strategy.md](docs/workflows/multi-agent-token-strategy.md) (agents in `.claude/agents/`). New issue: `/triage <number>`; implementing it: `/issue <number>` in the session model its `model:*` label names.
3. Check overlapping work: `git status`, open PRs. Do not commit to `main`.

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

- Code is the source of truth. When docs and code disagree, fix the doc in the same change (front matter `verified`, fragment in `docs/log.d/`) or add an open question — never leave a known-wrong statement behind.
- Before naming a file, symbol, key or route in a doc, confirm it exists with `grep`.
- Keep changes to the requested scope; refactors, dependency bumps and formatting passes are separate PRs.
- Secrets: never read or print any `config.json`, `.env*` or keystore.
- Everything is English: code, comments, commit messages, docs, PR and issue texts, and replies to the user (who may write in German or English).
- Keep answers short: no intro, no restating the question, no closing summary; bullets over prose. Keep conditions, caveats and reasons.
