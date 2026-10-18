## Context & Problem

`check:hygiene` reports a warning: `⚠ i18n: 23 known parity gap(s) in baseline`.
There are 23 translation keys present in either English or German but missing in the opposite language (specifically under `party.*`, `games.tabletop.*`, and `guessart.*`).
Resolving these gaps will eliminate the baseline tracking file and bring full bilingual consistency across the entire application.

## Branch

`i18n/zero-parity-gaps`

## Target Files

- `public/locales/de/translation.json` (Add missing German translations)
- `public/locales/en/translation.json` (Add missing English translations)
- `scripts/i18n-parity-baseline.json` (Empty or update baseline once all gaps are resolved)

## Missing Keys to Synchronize

### Missing in English (`en`):

- `party.roomCodeLabel` (DE: "Raum-Code")
- `party.moreGamesSoonTitle` (DE: "Weitere Spiele in Kürze...")

### Missing in German (`de`):

- `games.tabletop.empty`
- `games.tabletop.hand`
- `games.tabletop.discard`
- `games.tabletop.dropHere`
- `games.tabletop.cardCount`
- `games.tabletop.tile`
- `games.tabletop.loading`
- `games.tabletop.backToLobby`
- `games.tabletop.backToOverview`
- `guessart.roundsCount`
- `guessart.created`
- `guessart.lastPlayed`
- `guessart.pointsPerWord`
- `guessart.pointsDeductionPerHint`
- `guessart.playerScores`
- `guessart.roundDetails`
- `guessart.drawnBy`
- `guessart.timeTaken`
- `guessart.hintsUsed`
- `guessart.allGuesses`
- `guessart.catalogueTitle`

## Implementation Steps

1. Translate all missing keys naturally and idiomatically to match the style of existing translations.
2. Add the corresponding JSON keys to `public/locales/de/translation.json` and `public/locales/en/translation.json`.
3. Clear `scripts/i18n-parity-baseline.json` so it contains `[]`.
4. Run `npm run check:hygiene` to verify 0 parity gaps.

## Acceptance Criteria

- [ ] Both translation files are valid JSON and formatted with Prettier.
- [ ] `scripts/check-repo-hygiene.mjs` outputs `0 parity gaps`.
- [ ] `npm run check:docs` passes cleanly.

## Verification

```bash
npm run check:hygiene
npm run check:docs
npm test
```
