---
type: Howto
title: 'Owner checks — what only the maintainer can do'
description: 'Short checklists for closed issues whose last steps need a real device or TV, an account, a secret or an upstream release; agents did everything else and never ran these checks.'
tags: [owner, manual-checks, devices, upstream, backlog]
status: stable
generated:
  at: 2026-11-22T12:00:00+01:00
  by: claude-code
verified:
  at: 2026-11-22
  method: 'Collected while closing the open issues on 2026-11-22; each entry names the issue and what was done without the device, account or upstream project'
sources:
  - 'https://github.com/suitably/LocalGameGalaxy/issues'
---

# Owner checks

Each section belongs to a closed issue. Everything that works without a device, an account, a secret or an upstream release is done in code, tests and docs; the boxes below were **not** run by an agent. Tick a box (or delete the section) when done; open a new issue if a check fails.

## #665 — TypeScript 7 for the root package (upstream)

Blocked upstream: `npm view typescript-eslint peerDependencies` on 2026-11-22 still says `typescript >=4.8.4 <6.1.0` while `typescript` is at 7.0.2. Nothing can be done in this repository before that changes.

- [ ] When a `typescript-eslint` release accepts TS 7, bump the root `typescript` to 7.x (and `typescript-eslint`), keep `tsconfig` strictness, and run `npm run ci:gates && npm run build`; `check:lint-budget` must not rise.
- [ ] Pitfalls from #616: `server/` already pins TS 7.0.2 while ESLint uses the root TS; `tsc -b` writes `tsBuildInfoFile` under `node_modules/.tmp/`; tools on the TS JS API (`ts-api-utils`).
