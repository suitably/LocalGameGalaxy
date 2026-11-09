## 2026-11-09 — Tabletop performance slice 5 (claude-code)

- `docs/tech/tabletop-engine.md`: new §4 "Performance (#684)" (membership sets, memoised views, coalesced moves, drag frame store, one undo step per drag, measurement script); undo merges by drag gesture; canvas order without zIndex sort; touch long press cancelled by window moves.
- `docs/open-questions.md`: Q22 — p95 at 800 widgets stays above 16 ms under 4× CPU emulation; real-phone measurement and the D5 decision are open.
