## 2026-11-23 — Remove unused source files and dependencies (#840) (agent)

- `docs/tech/melodiq-architecture.md`: phone library search hook `usePhoneLibrarySearch.ts` removed (no caller); the Phone note now says so.
- Code outside `docs/` changed: 15 unused files deleted (Melodiq session setup subtree, unused hooks, guessart and storyteller leftovers, `components/Layout/index.ts`, `modules/async-game/index.ts`); `@mui/lab`, `@types/dompurify`, `@types/uuid` removed.
