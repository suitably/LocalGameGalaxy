---
type: Howto
title: 'Multi-agent workflow for lower token use'
description: 'When and how a Claude Code session splits work into scout, slice-implementer and gate-runner subagents so the main context stays small and bulk work runs on cheaper models; worked example issue #539.'
tags: [agents, claude-code, tokens, workflow, subagents]
status: draft
generated:
  at: 2026-10-24T18:00:00+02:00
  by: claude-code
verified:
  at: 2026-10-24
  method: 'Compared runs A/B on #539 with scripts/token-usage.mjs; ran scripts/token-usage.mjs on this session; checked .claude/agents/*.md, AGENTS.md §3 and §8, docs/tasks/ layout; example symbols grepped in src/games/tabletop.'
sources:
  - '.claude/agents/scout.md'
  - '.claude/agents/slice-implementer.md'
  - '.claude/agents/gate-runner.md'
  - 'AGENTS.md'
  - 'scripts/token-usage.mjs'
---

# Multi-agent workflow for lower token use

Worked example: [ISSUE-539 tabletop hidden space](../tasks/ISSUE-539-tabletop-hidden-space.md).

## 1. Where the tokens go

- **Every turn of the main session re-sends its whole context.** A 600-line file read on turn 3 is paid again on every later turn. Context size × number of turns is the main cost.
- **The main session runs the most expensive model.** Grepping, reading and running gates do not need it.
- **A subagent starts cold.** It pays for its own system prompt and its own reads, and only its final message enters the main context. Delegating saves tokens only when the subagent's reads would otherwise sit in the main context for many turns, or when it runs a cheaper model.

Consequence: delegate **bulk reading and mechanical work**, keep **decisions** in the main session, and pass state through **files**, not chat.

## 2. Roles

| Role                  | Where                                                                              | Model         | Does                                                                     | Returns                   |
| --------------------- | ---------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------ | ------------------------- |
| **Orchestrator**      | main session                                                                       | session model | triage, decisions, writes the task spec, reviews diffs, commits          | answer to the user        |
| **scout**             | [`.claude/agents/scout.md`](../../.claude/agents/scout.md)                         | haiku         | maps files, symbols, reuse candidates, open questions; read-only         | ≤ 40-line brief           |
| **slice-implementer** | [`.claude/agents/slice-implementer.md`](../../.claude/agents/slice-implementer.md) | sonnet        | large tickets only (§3): all slices from the spec, narrowest checks only | ≤ 15-line report          |
| **gate-runner**       | [`.claude/agents/gate-runner.md`](../../.claude/agents/gate-runner.md)             | haiku         | runs AGENTS.md §8 once                                                   | ≤ 20 lines, failures only |

Output caps are part of the contract: a subagent that returns file dumps cancels the saving.

## 3. Decision rule: delegate or not

Measured on #539 (§7): delegating the implementation to Sonnet slice-implementers cost **more** than doing it inline, because the orchestrator still needed as many turns and every implementer pays its own cold start. Haiku helpers (scout, gate-runner) cost cents. Hence:

**Default — inline with Haiku helpers.** The main session implements; a **scout** maps the area first when that needs more than ~5 file reads, and one **gate-runner** runs the gates before commit.

**Delegate the implementation** only when inline would clearly fill the main context — expected > ~200k tokens of context, mostly reading-heavy work, or > 4 independent slices. Then use **one** slice-implementer for all slices (one cold start), not one per slice.

Stay without any subagent for questions, trivial fixes, ≤ 3 files found with one grep, or work that needs judgment about code you have not seen.

Never use `subagent_type: "fork"` for reading: a fork inherits the full main context, so it is the most expensive way to grep.

## 4. Flow

1. **Triage (≤ 3 tool calls).** Read the issue and its comments, grep the area's doc row (AGENTS.md §1). Decide: trivial, inline (default) or delegated (§3).
2. **Scout** (Haiku) with a precise question when locating the change needs more than ~5 file reads. Spot-check 2–3 claims with grep instead of re-reading files.
3. **Decisions — one round.** Ask everything the code cannot answer in one question round, before any code. Decisions given with the request skip this.
4. **Spec only when it pays.** Write `docs/tasks/ISSUE-<n>-<slug>.md` when the work is delegated or will span sessions; inline single-session tickets skip it (the PR description holds the decisions).
5. **Implement** in AGENTS.md §3 order (logic → state hook → UI). Inline: narrowest check per step (one test file). Delegated: one slice-implementer for all slices, reviewed with `git diff --stat` plus the logic diffs.
6. **Gates.** One gate-runner. Fix failures, re-run only the failing gate.
7. **Close.** Owning docs, `docs/log.md`, commit, `npm run tokens`, PR with the table.

Fewer main-session turns is the main lever: batch independent tool calls in one turn, no progress commits or spec ticks between slices, no re-reading files you already have.

## 5. Anti-patterns

- Orchestrator reads the files "to double-check" the scout — pays twice. Spot-check one symbol with grep instead.
- "Explore and implement" in one subagent prompt — the implementer then explores on the more expensive model.
- Full `npm run quality-gates` after every slice; the slice runs its own test file, the gate-runner runs once.
- Parallel implementers on overlapping files — merge conflicts cost more than they saved.
- Passing chat history to subagents in the prompt instead of a spec path.
- One implementer per small slice, and progress commits or spec ticks between slices — each adds cold starts and orchestrator turns (run A in §7).
- Long untruncated command output in the main session (pipe through `tail -40`, CLAUDE.md).

## 6. Sessions

Entry point: **`/issue <number> [decisions]`** ([`.claude/skills/issue/SKILL.md`](../../.claude/skills/issue/SKILL.md)) runs this flow; on an issue that already has a spec it resumes at the first unchecked item of the spec's Progress list.

- **One session per ticket.** A new ticket never continues an old session: the old context would be re-sent on every turn. Start with the spec path, e.g. "Implement `docs/tasks/ISSUE-539-…md`, decisions §3: …".
- **Stay in that session for the whole ticket.**
- **Session model:** routine tickets may run on Sonnet (`/model`), which costs half of Opus per token; keep Opus for design-heavy work. **Unverified:** quality impact not measured yet.
- **Context grew large or was compacted** → write the state into the spec ("slice 1 done, commit abc"), then continue in a new session from the spec.

## 7. Measuring

Results:

| Run (#539, same decisions, same base)     | Main session (Opus)                  | Subagents                                                     | Total       | Output                                  |
| ----------------------------------------- | ------------------------------------ | ------------------------------------------------------------- | ----------- | --------------------------------------- |
| A — `/issue`, 4 Sonnet slice-implementers | 40 calls, 4.01 M cache read, $1.76   | implementers $0.79, gate-runner $0.00 (+ scout $0.02 earlier) | **≥ $2.57** | 6 commits, logic + reducer + hook tests |
| B — inline, no subagents                  | 29 calls, 3.32 M cache read, ≈ $1.98 | —                                                             | **≈ $1.98** | 1 commit, fewer reducer tests           |

Single data point; B's cost computed by hand from its token columns. Next comparison: the inline default with Sonnet as the session model.
