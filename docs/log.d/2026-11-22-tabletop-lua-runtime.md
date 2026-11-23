## 2026-11-22 — Tabletop host-only Lua runtime (agent)

- `docs/tech/tabletop-engine.md` §3 "Lua runtime" (#705, TTS plan slice 9): VM interface and wasmoon adapter in a Worker, sandbox and instruction budget, shim v1 function list, script intents through `acceptScriptIntent`, script buttons, events (`luaEvents.ts`), `LuaScriptState` persistence.
- `docs/tech/tabletop-engine.md`: host wiring (`useLuaRuntime`, `LuaRuntimeHost`), flag `TABLETOP_LUA_RUNTIME`, game-menu entries and script log, watchdog, pause while hidden, chunk sizes, `importReport.unshimmed`.
- `docs/reports/2026-11-08-tts-compatibility-plan.md` §5: status line for slice 9.
