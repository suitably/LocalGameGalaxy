## 2026-11-14 — Built-in signaling tracker, client reconnect rules documented (claude-code)

- `docs/tech/webrtc-signaling.md` §5: new section on the tracker built into the companion server (`/signaling`, `server/src/core/signaling.ts`), its detection through `/api/info` (`detectHelperSignaling`, `SIGNALING_DETECTED`) and the lookup order of `getSignalingUrl()`.
- §3–§4: `CONNECTION_TIMEOUT_MS` is 10 s; one search at a time; a fresh search when the page returns to the foreground or comes back online.
