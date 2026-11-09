## 2026-11-08 — Back-button registry and stage wake lock (claude-code)

- `docs/tech/architecture.md` §3.2: new row for `src/lib/backButton.ts` (#690). Melodiq Notes stage uses the shared `useWakeLock` and registers a back handler (`stage/useStageLifecycle.ts`).
- **Unverified:** Web MIDI / BLE MIDI inside the Android WebView was not checked on a device (#690); `docs/tech/melodiq-notes-architecture.md` does not exist yet (#689), so the note is in the PR body and on #709.
