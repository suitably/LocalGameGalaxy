---
name: issue
description: Implement a GitHub issue of suitably/LocalGameGalaxy end to end with the token-saving multi-agent workflow (scout → task spec → decisions → slice-implementers → gate-runner → PR). Use when the user gives an issue number, e.g. "/issue 539".
argument-hint: <issue-number> [decisions or notes]
---

# /issue $ARGUMENTS

Follow [docs/workflows/multi-agent-token-strategy.md](../../../docs/workflows/multi-agent-token-strategy.md). You are the orchestrator: decide, write the spec, review diffs. Do not read source files yourself beyond spot-check greps; subagents read and write code.

The first word of the arguments is the issue number `N`; anything after it is the user's decisions or notes for this issue.

## 0. Resume or start

- `ls docs/tasks/ISSUE-N-*.md` (and `git log --oneline -5`, `git status`).
- Spec exists → read it, continue at the first unchecked step of its `## Progress` list. Skip to that step.
- No spec → step 1.

## 1. Triage (≤ 3 tool calls, inline)

- Read the issue and its comments (`gh issue view N --comments`, or the GitHub MCP tool `issue_read` with `get` and `get_comments` when `gh` is unavailable).
- `grep -n -i "<area>" docs/tech/game-catalog.md docs/open-questions.md` for the area.
- Trivial (≤ 3 files, one grep finds them) → do it inline without subagents, skip to step 6.

## 2. Scout

One `scout` subagent with the issue text and concrete questions: where the feature lives, what to reuse, which files are near the 250-line budget, what the code cannot answer. Two scouts in parallel only for disjoint areas. Spot-check 2–3 of its claims with `grep`.

## 3. Spec

Write `docs/tasks/ISSUE-N-<slug>.md` (front matter per [knowledge-base-maintenance](../../../docs/workflows/knowledge-base-maintenance.md), `type: Task`, `status: draft`), add it to `docs/tasks/index.md`. Sections:

1. **Request** — issue and comments in 3–6 bullets.
2. **Facts** — table from the scout brief: fact | `path:line`.
3. **Decisions** — what the code and issue cannot settle, each with your recommended option.
4. **Slices** — logic → state hook → UI (AGENTS.md §3); per slice: files to touch, functions/actions, tests. Mark which slices may run in parallel (disjoint files only).
5. **Acceptance criteria** — checkboxes.
6. **Progress** — `- [ ] decisions`, `- [ ] slice 1 …`, `- [ ] gates`, `- [ ] docs`, `- [ ] PR`.

## 4. Decisions (one round)

- Decisions already given in the arguments → apply them.
- Otherwise ask all open ones in one `AskUserQuestion` call (recommended option first). Never ask again later for something you could have asked here.
- Write the answers into the spec, tick `decisions`, commit the spec.

## 5. Slices

For each slice in order: one `slice-implementer` with the prompt "Implement slice K of `docs/tasks/ISSUE-N-<slug>.md`. Touch only the listed files." Then review `git diff --stat` and the diff of logic files only. Small fix → inline; larger → `SendMessage` to the same implementer. Tick the slice in Progress.

## 6. Close

1. One `gate-runner`; fix failures (inline if small, else back to the implementer).
2. Update the owning docs (`docs/tech/…`, `docs/log.md`, CHANGELOG) per AGENTS.md §9; mark the spec `status: stable`.
3. Commit (Conventional Commits), push, open the PR with `Closes #N`.
4. `npm run tokens` → paste the table into the PR description under "Token usage".
5. Tick the remaining Progress items.
