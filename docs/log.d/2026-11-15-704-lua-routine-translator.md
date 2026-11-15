## 2026-11-15 — Static TTS Lua → routine translator (claude-code)

- `docs/tech/tabletop-engine.md` §3: new "Workshop Lua" paragraph (translator pipeline, mapped idioms, what stays untranslated, inert buttons, report fields, harness metric); the §3 intro no longer calls Lua out of scope.
- Code outside `docs/` changed (#704): `src/games/tabletop/logic/{luaTranslator,luaWalker,luaIdioms,luaValues,ttsLuaImport}.ts`, `ttsParser.ts`, `importTypes.ts`, `importSanitizers.ts`, `types.ts`, `ButtonWidgetView.tsx`, `ImportReportView.tsx`, locales, `scripts/tts-compat/{analyze.mjs,README.md}`; `luaparse` moved to runtime dependencies.
