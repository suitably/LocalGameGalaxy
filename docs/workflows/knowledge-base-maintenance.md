---
type: Howto
title: 'Maintaining the knowledge base (OKF v0.2)'
description: 'Rules for editing docs/: front matter, links, one topic per home, uncertainty markers, open questions, the change log, reports, archive and index files.'
tags: [docs, okf, knowledge-base, agents, maintenance]
status: stable
generated:
  at: 2026-10-21T12:00:00+02:00
  by: claude-code
verified:
  at: 2026-10-21
  method: 'moved verbatim from AGENTS.md §9; checked against docs/ layout and scripts/check-docs-sync.mjs'
sources:
  - 'AGENTS.md'
  - 'scripts/check-docs-sync.mjs'
---

# Maintaining the knowledge base (OKF v0.2)

Read this before you edit anything under `docs/`. Format: one concept per markdown file, YAML front matter, progressive disclosure through `index.md` files ([spec](../references/external-sources.md#okf)).

## 1. Front matter

Concept docs (everything except `index.md` files, `log.md`, `open-questions.md`) carry:

```yaml
---
type: Reference | Howto | Report | ADR | Task
title: '…'
description: 'One sentence — agents use it to decide whether to open the file.'
tags: […]
status: stable | draft | deprecated
generated:
  at: 2026-10-18T15:00:00+02:00 # last meaningful content edit
  by: claude-code # tool/agent name, no model ids
verified:
  at: 2026-10-18 # last time claims were checked against the code
  method: 'what you read or ran'
sources:
  - 'src/… or URL'
---
```

Only the root `docs/index.md` carries `okf_version`. Directory `index.md` files have no front matter.

## 2. Writing rules

- **Relative markdown links** with `.md` (`[text](../tech/persistence.md#2-indexeddb-databases)`). Never `file:///…` or absolute home paths.
- **One topic, one home.** Link to the owning doc instead of copying facts — duplicated facts drift (the 2026-10-18 audit found 149 broken references).
- Document what the code **does**, not what it should do. Name real files and symbols; check that they exist (`grep -rn <symbol> src server/src`) before writing them down.
- Mark uncertainty: `**Unverified:**`, `**Inference:**`.
- Write docs in **English**.

## 3. Lifecycle

- Contradiction you cannot resolve → add it to [open-questions.md](../open-questions.md); resolved → move the answer into the owning doc, delete the item, note it in [log.md](../log.md).
- Every change to the bundle → an entry at the top of [log.md](../log.md) (`## YYYY-MM-DD — summary (agent)`; say whether code outside `docs/` changed).
- One-off investigations, audits, evaluations → `docs/reports/YYYY-MM-DD-topic.md`, never updated later except for corrections.
- Finished task specs and retired setups → `status: deprecated`, move to `docs/archive/`, fix incoming links. Open task specs live in `docs/tasks/` and mirror GitHub issues.
- New file → add it to its directory `index.md` and, if top-level relevant, to the table in [docs/index.md](../index.md).
- Architecture, data model, storage key, sync message, server route or game changes → update the owning doc (`architecture.md`, `game-catalog.md`, `persistence.md`, `sync-protocol.md`, …) in the same PR. `npm run check:docs` enforces that _some_ doc changes alongside core code, not that it is the right one.
