## 2026-11-15 — tabletop-engine, architecture: rights and publishing for TTS imports (#702) (agent)

- `docs/tech/tabletop-engine.md` §6: companion copies of imported third-party games carry `companionPrivate`; the server lists them as `private` and keeps the flag on overwrite. §7: `format: 'tts-workshop'`, publish refusal, `WorkshopRightsNotice`, companion Path A as a JSON/BSON pass-through that stores nothing.
- `docs/tech/architecture.md` §3: `GET /api/tabletop/workshop/:id` pass-through, `private` in listing entries.
- Outside `docs/`: `logic/{types,gameValidator,ttsParser,publishValidator,serverGameSnapshot,steamWorkshopApi,tabletopServerApi}.ts`, `hooks/useWorkshopImport.ts`, `components/manager/{ImportWorkshopDialog,WorkshopRightsNotice}.tsx`, `components/publisher/PublishTabletopGameDialog.tsx`, server `routes/{workshop,library}.ts`, `services/scanner.ts`, `core/types.ts`, locale keys `games.tabletop.workshop.rights_*`, `publish_blocked`.
