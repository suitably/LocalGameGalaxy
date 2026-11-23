## 2026-11-22 — Melodiq remote host settings over room events (agent)

- `docs/tech/melodiq-architecture.md` §2.7: remote host settings now use `settings.get` / `settings.set` / `settings.state` room events (#816, step 3 of #813) instead of `host.settings.*` data-channel messages; role check on the transport-stamped `from` only, patch guard, host hook `useHostSettingsRpc`, phone hook `useRemoteHostSettings`.
- Code outside `docs/` changed (Melodiq host settings protocol, host and phone hooks).
