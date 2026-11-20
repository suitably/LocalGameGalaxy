## 2026-11-16 — Tabletop: Lua translator control flow, positioned draws, native re-import (claude-code)

- `docs/tech/tabletop-engine.md` §3: step table gains `DRAW` `at`/`faceUp`, `TAKE_FROM_BAG` `at`, `SHUFFLE` on a bag; "Workshop Lua" rewritten for `logic/luaControl.ts` (static conditions, unrolled loops, wait loops), `startLuaCoroutine` / `Wait` inlining, `Global.getTable`, `onload`, positioned `takeObject`, `setPosition`, the two-press check for script variables (`stateful`) and the note that translation happens at import only.
- `docs/tech/tabletop-engine.md` §7: own exports are read by `logic/nativeGameFile.ts`; TTS model bags import as bags.
