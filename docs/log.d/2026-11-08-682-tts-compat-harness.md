## 2026-11-08 — TTS compatibility harness, #682 (claude-code)

- `scripts/tts-compat/README.md` (new): usage, tier rules, regression gate. `scripts/README.md` index entry; `docs/tech/tabletop-engine.md` §TTS import links the harness.
- Outside `docs/`: `scripts/tts-compat/` (`run.mjs`, `analyze.mjs`, `lua.mjs`, `fetch.mjs`, `load-parser.mjs`, `corpus.json`, `fixture.save.json`, tests), `luaparse` devDependency, `test:scripts` glob, `.gitignore` cache entry.
