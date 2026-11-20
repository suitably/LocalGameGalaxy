## 2026-11-16 — Architecture check guards the header and accessibility rules (agent)

- `docs/tech/coding-conventions.md`: four new rows in the enforcement table (`AppBar` in games, `setHeaderHidden(` allowlist, back-arrow icon ratchet, unnamed `IconButton` ratchet); `AGENTS.md` §4 header bullet names the checks and the Melodiq Notes immersive exception; the UI/UX audit report notes that its step 9 ratchets exist.
- Code outside `docs/` changed: `scripts/check-architecture.mjs`, `scripts/lib/header-rules.mjs` (+ test), `scripts/back-icon-baselines.json`, `scripts/icon-button-label-baselines.json`. No `src/` change.
