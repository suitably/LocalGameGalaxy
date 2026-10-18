## Context & Problem

In PR #346 (`refactor(backend): Unify companion servers and remove obsolete standalone containers`), companion servers are consolidated into a unified Hono micro-kernel. However, the CI quality gate fails because `SetupDockerTab.tsx` grew from 286 to 340 lines (+54 lines), violating the anti-God-component budget ratchet (`check:budget`).

## Branch

`fix/unblock-backend-companion-pr-346`

## Target Files

- `src/components/connection/setup/SetupDockerTab.tsx` (Current: 340 lines, Target: < 200 lines)
- New co-located sub-component: `src/components/connection/setup/DockerCommandCard.tsx`
- New co-located sub-component: `src/components/connection/setup/DockerComposeViewer.tsx`

## Implementation Steps

1. Decompose `SetupDockerTab.tsx` using the 3-Tier Decomposition Pattern (AGENTS.md Section 3.1):
   - Extract the command copy/display blocks into `DockerCommandCard.tsx` (typed props: command, label, onCopy, copiedState).
   - Extract the compose yaml preview/download section into `DockerComposeViewer.tsx`.
2. Keep `SetupDockerTab.tsx` strictly as a clean orchestrator component (< 200 lines).
3. Do not modify the underlying compose generator logic (`composeYamlGenerator.ts`).
4. Ensure no `any` is introduced and all strings use `t('key')`.

## Acceptance Criteria

- [ ] `src/components/connection/setup/SetupDockerTab.tsx` is strictly under 250 lines (target < 200 lines).
- [ ] `npm run check:budget` exits with code 0.
- [ ] No regression in Docker tab UI functionality (command copy, YAML download).
- [ ] PR #346 can rebase/merge cleanly without budget errors.

## Verification

```bash
npm run check:budget
npm run check:architecture:diff
npm run lint
npm test
```
