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
  method: 'Checked .claude/agents/*.md, AGENTS.md §3 and §8, docs/tasks/ layout; example symbols grepped in src/games/tabletop.'
sources:
  - '.claude/agents/scout.md'
  - '.claude/agents/slice-implementer.md'
  - '.claude/agents/gate-runner.md'
  - 'AGENTS.md'
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
| **slice-implementer** | [`.claude/agents/slice-implementer.md`](../../.claude/agents/slice-implementer.md) | sonnet        | one slice (logic / state hook / UI) from the spec, narrowest checks only | ≤ 15-line report          |
| **gate-runner**       | [`.claude/agents/gate-runner.md`](../../.claude/agents/gate-runner.md)             | haiku         | runs AGENTS.md §8 once                                                   | ≤ 20 lines, failures only |

Output caps are part of the contract: a subagent that returns file dumps cancels the saving.

## 3. Decision rule: delegate or not

Stay inline (no subagent) when any of these holds:

- question, trivial fix, or the change touches ≤ 3 files you can locate with one grep;
- the next step depends on judgment about code you have not seen (read it yourself);
- the work is a single short command (one test file, one grep).

Delegate when:

- locating the change needs more than ~5 file reads → **scout**;
- the task has ≥ 2 slices per AGENTS.md §3 → one **slice-implementer** per slice;
- before commit → **gate-runner** (one run, not per slice).

Never use `subagent_type: "fork"` for reading: a fork inherits the full main context, so it is the most expensive way to grep.

## 4. Flow

1. **Triage (inline, ≤ 3 tool calls).** Read the issue and its comments, grep the area's doc row (AGENTS.md §1). Decide: inline or delegated.
2. **Scout.** One scout with a precise question ("where are hidden zones rendered, moved, synced; how does edit mode move/resize widgets"). Run two scouts in parallel only for disjoint areas.
3. **Spec (orchestrator).** Write `docs/tasks/ISSUE-<n>-<slug>.md` from the brief: decisions, slices, file list per slice, acceptance criteria. Open questions the code cannot answer go to the user now — one round of questions, before any code. The spec is the shared memory; subagents read it instead of the chat.
4. **Slices, in order** logic → state hook → UI (AGENTS.md §3). Sequential when a slice uses the previous one's types; parallel only for disjoint file sets. Each prompt: spec path + slice number + "touch only these files".
5. **Review (orchestrator).** `git diff --stat`, then `git diff -- <file>` for the files that carry rules. Do not re-read files the scout already summarized. Fix small issues inline; send larger ones back to the same implementer via `SendMessage` (it keeps its context).
6. **Gates.** One gate-runner. Fix failures inline if small, else back to the implementer.
7. **Close.** Commit, update owning docs and `docs/log.md`, move the spec to `docs/archive/` when the issue closes.

## 5. Anti-patterns

- Orchestrator reads the files "to double-check" the scout — pays twice. Spot-check one symbol with grep instead.
- "Explore and implement" in one subagent prompt — the implementer then explores on the more expensive model.
- Full `npm run quality-gates` after every slice; the slice runs its own test file, the gate-runner runs once.
- Parallel implementers on overlapping files — merge conflicts cost more than they saved.
- Passing chat history to subagents in the prompt instead of a spec path.
- Long untruncated command output in the main session (pipe through `tail -40`, CLAUDE.md).

## 6. Measuring

**Unverified:** no baseline exists yet. Compare `/cost` (CLI) or the session usage for one delegated task against a similar inline one, and record the numbers in the PR description. Adjust the thresholds in §3 when the numbers say so.
