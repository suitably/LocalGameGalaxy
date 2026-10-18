## Context & Problem

`jscpd` identifies 5 separate clone clusters across the card game views:

1. `OhHellGameView.tsx` [36–55] <-> `UniversalScoreView.tsx` [37–56] (20 lines: duplicate score row calculation)
2. `OhHellGameView.tsx` [106–121] <-> `UniversalScoreView.tsx` [90–105] (16 lines: duplicate round score badge mapping)
3. `OhHellGameView.tsx` [131–143] <-> `SchwimmenGameView.tsx` [174–186] (13 lines: duplicate active player indicator)
4. `OhHellGameView.tsx` [323–338] <-> `UniversalScoreView.tsx` [232–247] (16 lines: duplicate player ranking footer)
5. `SchwimmenGameView.tsx` [198–214] <-> `UniversalScoreView.tsx` [140–156] (17 lines: duplicate life/points card)

In addition, `SchwimmenGameView.tsx` currently has **510 lines**, heavily violating the 250-line component budget.

## Branch

`refactor/cards-views-dedup`

## Target Files

- `src/games/cards/components/OhHellGameView.tsx`
- `src/games/cards/components/SchwimmenGameView.tsx` (Target: < 250 lines)
- `src/games/cards/components/UniversalScoreView.tsx`
- New sub-component: `src/games/cards/components/common/CardPlayerScoreRow.tsx`
- New sub-component: `src/games/cards/components/common/CardGameScoreSummary.tsx`

## Implementation Steps

1. **Extract Score Presenters**:
   - Extract `CardPlayerScoreRow.tsx` under `src/games/cards/components/common/` with clean props (player name, current points/lives, active indicator, rank).
   - Extract `CardGameScoreSummary.tsx` for rendering the shared ranking table.
2. **Refactor Game Views**:
   - Refactor `OhHellGameView.tsx`, `UniversalScoreView.tsx`, and `SchwimmenGameView.tsx` to use the shared score components.
   - For `SchwimmenGameView.tsx`, also extract action buttons / card hand strip into a sub-component so its total line count drops below 250 lines.
3. Keep intra-game shared code within `src/games/cards/components/common/` (no cross-game violations).

## Acceptance Criteria

- [ ] Over 80 lines of duplicated code eliminated (`npm run check:duplicates` clears card clones).
- [ ] `SchwimmenGameView.tsx` is under 250 lines (`npm run check:budget` passes).
- [ ] Card game score displays in Oh Hell, Schwimmen, and Universal tracker function identically.
- [ ] All quality gates pass.

## Verification

```bash
npm run check:duplicates
npm run check:budget
npm run check:architecture:diff
npm test
npm run lint
```
