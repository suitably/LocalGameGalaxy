---
name: triage
description: Rate GitHub issues of suitably/LocalGameGalaxy before work starts — which session model fits (Sonnet / Opus), which decisions the maintainer must make first, size and dependencies — and record it as labels plus one issue comment. Use after creating an issue ("/triage 541") or for all untriaged open issues ("/triage").
argument-hint: [issue-number ...] [--force]
---

# /triage $ARGUMENTS

Run this in a **Sonnet** session. It only reads code and writes labels/comments on GitHub; it never changes the repository.

## 1. Pick the issues

- Numbers in the arguments → those issues.
- No arguments → all open issues without any of the labels below (`list_issues` with `state: OPEN`, fields `number,title,body,labels,comments`).
- **Skip already triaged issues** (another contributor's Claude may have done it): an issue that has a `model:*`, `manual` or `tracking` label or a `**Triage:**` comment is left alone. Re-triage only with `--force` in the arguments; then edit the existing triage comment instead of adding a second one.

## 2. Check the code (cheap)

Only when the text alone cannot settle it (does the feature exist, how many files, is it partly done): one `scout` subagent for **all** selected issues together, with 1–3 concrete questions per issue. Also grep `docs/log.md` and `docs/tasks/` for the issue number or topic — recent work may already cover part of it.

## 3. Classify (first matching rule wins)

| Label            | When                                                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tracking`       | Epic or tracking issue with sub-issues or checklists of other issues — no own implementation.                                                                                                                             |
| `manual`         | Needs a human: visual QA on devices, store listings, graphics, a manual test.                                                                                                                                             |
| `needs-decision` | Behaviour, scope or semantics the code cannot settle (in addition to a model label).                                                                                                                                      |
| `model:opus`     | Sync/protocol, server API or permissions, security or secrets, audio/DSP or other algorithms, a new concept (e.g. spectators), data-model unification, "analyse best practice", unclear scope, or > 4 independent slices. |
| `model:sonnet`   | Clear scope, an existing pattern to follow, ≤ ~10 files; mechanical refactors, renames, i18n, audits with a script, a spec already in `docs/tasks/`.                                                                      |

When unsure between Sonnet and Opus → `model:opus` (a weak model on a hard ticket costs rework; the reverse only costs ~2× tokens). Large but mechanical (many files, one pattern) stays `model:sonnet` with mode "delegated".

## 4. Record

Per issue, in one turn where possible:

- **Labels:** add the labels with `issue_write` (method `update`). The `labels` field replaces the whole list — always send the existing labels plus the new ones. Re-triage: drop the old `model:*` label first.
- **Comment** (one, only if there is something to say), ending with the attribution footer:

  ```
  **Triage:** model:<…> · mode <trivial|inline|delegated> · size <S|M|L>
  Depends on: #… (or none) · Partly done: … (or nothing found)

  **Decisions needed** (answer here; `/issue N` reads this thread):
  1. <question> — recommended: <option>
  ```

Do not comment when the issue is `tracking` with nothing to add.

## 5. Report

A table `# | title | labels | mode | decisions` — no further prose.
