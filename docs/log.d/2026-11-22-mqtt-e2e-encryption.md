## 2026-11-22 — MQTT end-to-end encryption, ADR 0009 (agent)

- `docs/adr/0009-mqtt-end-to-end-encryption.md`: new ADR (#662, maintainer decision 2026-11-07; one-release plaintext transition, retain only last state, typed-code hint).
- `docs/tech/sync-protocol.md`: encrypted envelope, room keys and `key=` fragment, per-mailbox `retain` table, storage prefix `ROOM_KEY`.
- `docs/tech/persistence.md`: `STORAGE_PREFIXES.ROOM_KEY`.
- `docs/tech/privacy-notice.md` (with `public/datenschutz.html`, `public/privacy.html`): payloads encrypted, only the last state retained, plaintext transition.
