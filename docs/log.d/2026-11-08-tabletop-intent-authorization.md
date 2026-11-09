## 2026-11-08 — Tabletop per-seat intent authorization and hand redaction (claude-code)

- `docs/tech/tabletop-engine.md`: new "Intent authorization" section (host-only editor actions, own-hand and own-zone rules, sender seat, residual risk of the unauthenticated `seat` URL param); "Private hands" now redacts hands whenever WebCrypto exists, before any seat key (#685).
