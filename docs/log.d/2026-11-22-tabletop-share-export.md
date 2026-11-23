## 2026-11-22 — Tabletop games shared by export and companion library, GitHub PR publishing removed (agent)

- `docs/tech/tabletop-engine.md` §6: new "Sharing a game (#703)" paragraph (share menu, `shareRules.ts`, export round trip, PAT kept only for feedback and GuessArt); §7 rights note points at `shareRules.ts` instead of `publishValidator`; `verified` updated.
- `docs/adr/0005-tabletop-scripting-for-imported-games.md` decision 5: note that the GitHub publishing path is gone since #703.
- `docs/tech/game-catalog.md`: tabletop no longer imports `lib/github`.
- `docs/tech/secrets-management.md`: the GitHub PAT row names its remaining users (feedback, GuessArt PRs).
