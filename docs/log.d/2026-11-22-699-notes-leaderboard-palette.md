## 2026-11-22 — Melodiq Notes leaderboard on the pults and judgement palette (claude-code)

- Code changed outside `docs/` (#699): `pult/logic/protocol.ts` (`board`, `BOARD`, `pultBoardOf`, `parsePultBoard`), `pult/useStageRoom.ts`, `pult/components/PultLeaderboard.tsx`, `stage/logic/judgementStyle.ts`, `settings/JudgementPaletteSetting.tsx`, `colorBlindPalette` in `src/themeTokens.ts`, new storage key `MELODIQ_NOTES_JUDGEMENT_PALETTE`.
- `tech/melodiq-notes-architecture.md` §3/§4 describe the shared leaderboard and the judgement style; `tech/persistence.md` lists the key; `tech/game-catalog.md` counts 10 `MELODIQ_NOTES_*` keys; `DESIGN.md` §2.3 names the colour-blind palette.
