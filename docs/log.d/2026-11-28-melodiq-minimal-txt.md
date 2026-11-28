## 2026-11-28 — Melodiq: a header-only .txt gives way to sheet music (agent)

- `docs/tech/melodiq-architecture.md` §2.11: `txtHasNotes`; the server's minimal `.txt` gives way to the score and otherwise plays without notes; `useSongVocals` falls back to it when no score has a vocal part.
- Code outside `docs/` changed (`logic/songVocals.ts`, `gameplay/hooks/useSongVocals.ts`).
