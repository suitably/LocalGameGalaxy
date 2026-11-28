## 2026-11-28 — Keep-alive game pages: Melodiq keeps running behind other pages (agent)

- `docs/tech/melodiq-architecture.md` §2.5: Melodiq stays mounted while the host is elsewhere in the app (#888).
- `docs/tech/data-models.md`: `GameDefinition.keepAlive`.
- Code outside `docs/` changed (`src/components/Layout/KeepAliveGames.tsx`, `keepAliveRoutes.ts`, `MainLayout.tsx`, `src/App.tsx`, `src/context/routeActiveContext.ts`, `src/lib/catalog/types.ts`, Melodiq `definition.tsx`, `useMelodiqHeader.tsx`, `useSessionAudioController.ts`).
