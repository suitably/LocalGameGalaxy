## 2026-11-23 — Import cycle rule and storageCore split (agent)

- `docs/tech/coding-conventions.md` §2: new anti-pattern row "Import cycle" (`check:architecture` rule 12, graph code in `scripts/lib/import-cycles.mjs`).
- `docs/tech/persistence.md` §1: `STORAGE_KEYS` and the storage implementation live in `src/lib/storageCore.ts`; `storage.ts` re-exports it and keeps the deprecated delegates.
- `AGENTS.md` §4: no import cycles.
- Code outside `docs/` changed (storage split, Melodiq phone client context, Cabo rules, cycle check).
