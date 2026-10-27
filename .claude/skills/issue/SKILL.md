---
name: issue
description: Implement a GitHub issue of suitably/LocalGameGalaxy end to end with the token-saving multi-agent workflow (inline by default with Haiku scout and gate-runner; Sonnet implementer only for large tickets). Use when the user gives an issue number, e.g. "/issue 539".
argument-hint: <issue-number> [decisions or notes]
---

# /issue $ARGUMENTS

Follow [docs/workflows/multi-agent-token-strategy.md](../../../docs/workflows/multi-agent-token-strategy.md). Measured on #539: inline implementation with Haiku helpers is cheaper than Sonnet implementers per slice, so inline is the default.

The first word of the arguments is the issue number `N`; anything after it is the user's decisions or notes for this issue.

## 0. Claim, resume or start

- **Claim check (several contributors work with Claude):** in one turn read the issue's assignees, search open PRs for `#N` (`search_pull_requests` with `repo:suitably/LocalGameGalaxy is:open N`) and `git ls-remote --heads origin | grep -i "N"`. Assigned to someone else, or an open PR / branch for `#N` by someone else → stop and tell the user who works on it. Otherwise assign the issue to yourself (`issue_write` `update` with `assignees`, keep existing labels untouched by omitting `labels`).
- `ls docs/tasks/ISSUE-N-*.md` (and `git log --oneline -5`, `git status`).
- Spec exists → read it, continue at the first unchecked item of its Progress list (delegated mode).
- No spec → step 1.

## 1. Triage (≤ 3 tool calls)

- Read the issue, its labels and comments (`gh issue view N --comments`, or the GitHub MCP tool `issue_read` with `get` and `get_comments` when `gh` is unavailable). Answers to a `**Triage:**` comment are decisions — use them, do not ask again.
- **Model guard:** no `model:*` label → classify with the rules of `.claude/skills/triage/SKILL.md` §3 first. Label `model:opus` but this session runs on a smaller model, or `needs-decision` without answers in the thread → stop before any further work and tell the user which model to start with (`/model …`) or which questions are open. `manual` / `tracking` → do not implement; say so.
- `grep -n -i "<area>" docs/tech/game-catalog.md docs/open-questions.md` for the area.
- Pick the mode (workflow §3): **trivial** (≤ 3 files, one grep finds them) → implement, go to step 5. **Inline** (default) → steps 2, 3, 4a, 5. **Delegated** (inline would exceed ~200k context, reading-heavy, or > 4 independent slices) → steps 2, 3, 4b, 5.

## 2. Scout

When locating the change needs more than ~5 file reads: one `scout` subagent with the issue text and concrete questions (where the feature lives, what to reuse, files near the 250-line budget, what the code cannot answer). Spot-check 2–3 claims with `grep`; do not re-read the files it summarized.

## 3. Decisions (one round)

- Decisions given in the arguments → apply them.
- Otherwise ask all open ones in one `AskUserQuestion` call (recommended option first). Never ask again later for something you could have asked here.

## 4a. Implement inline (default)

- No spec file; the decisions go into the PR description.
- AGENTS.md §3 order (logic → state hook → UI); after each step only the narrowest check (one test file, `npx eslint <files>`).
- Batch independent tool calls in one turn; no commits between steps.

## 4b. Implement delegated

- Write `docs/tasks/ISSUE-N-<slug>.md` (front matter per [knowledge-base-maintenance](../../../docs/workflows/knowledge-base-maintenance.md), `type: Task`; sections Request, Facts, Decisions, Slices with files per slice, Acceptance criteria, Progress) and add it to `docs/tasks/index.md`.
- **One** `slice-implementer` for all slices: "Implement all slices of `docs/tasks/ISSUE-N-<slug>.md` in order. Touch only the listed files."
- Review `git diff --stat` and the logic diffs; fixes inline or via `SendMessage` to the same implementer. Update Progress once at the end.

## 5. Close

1. One `gate-runner`; fix failures and re-run only the failing gate.
2. Owning docs (`docs/tech/…`, a `docs/log.d/` fragment, a `changelog.d/` fragment) per AGENTS.md §2/§9; spec (if any) → `status: stable`.
3. `npm run tokens` — **required before the PR**: the PR description must contain the table under "Token usage" with the mode (trivial / inline / delegated).
4. Commit (Conventional Commits), push, open the PR with `Closes #N`.
