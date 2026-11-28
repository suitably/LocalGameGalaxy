## 2026-11-28 — Melodiq TV applies host settings without echoing them (agent)

- `docs/tech/melodiq-architecture.md` §2.9: the TV only applies `SETTINGS_UPDATE` (`applyRemoteSettings`, `logic/tvSettings.ts`); why it must not store or publish them again.
- Code outside `docs/` changed (`SettingsContext.tsx`, `settingsContextCore.ts`, `useTVReceiver.ts`, `logic/tvSettings.ts`).
