# Technical architecture

How the code works **right now**. One topic, one file. Start with the architecture SSoT, then the doc for your area.

## Core

- [System architecture (SSoT)](architecture.md) — stack, folder layout, boundaries, shared modules, layout contexts, companion server, tracker.
- [Game catalog](game-catalog.md) — every game: route, folder, size, storage, sync, i18n source, shared imports, tests.
- [Coding conventions](coding-conventions.md) — 250-line budget + ratchet, decomposition pattern, anti-pattern matrix with what enforces each rule.
- [Data models](data-models.md) — where the real TypeScript types live, with excerpts.
- [Persistence](persistence.md) — `storage.ts`, `STORAGE_KEYS`, the six IndexedDB databases, server files.
- [Sync protocol](sync-protocol.md) — MQTT mailbox, `useMultiChannelSync`, Melodiq WebRTC/TV messages, Web Push / ntfy relay.
- [Tabletop engine](tabletop-engine.md) — reducer groups, editor operations, undo/redo deltas, host-authoritative sync, autosave.
- [WebRTC signaling](webrtc-signaling.md) — tracker handshake, info-hash, candidate race, reconnects, tracker precedence.
- [C4 diagrams](c4-diagrams.md) — system context and containers.

## Game internals

- [Melodiq](melodiq-architecture.md) — host / TV / phone roles, hooks, playback modes, technical debt.
- [Song pipeline](song-pipeline.md) — USDB + yt-dlp download jobs, audio-separator, whisper alignment, endpoints.
- [Werewolf](werewolf-architecture.md) — roles, night order, state machine, TTS.
- [Qwixx sheet rules](qwixx-sheet-rules.md) — variants and scoring.

## Cross-cutting

- [i18n strategy](i18n-strategy.md) — `public/locales` vs per-game bundles, namespaces, parity gate.
- [Styling](styling.md) — MUI theme, safe areas, Capacitor touch CSS.
- [Testing guide](testing-guide.md) — Vitest, `node --test`, environment, mocks.
- [Pipeline quality gates](pipeline-quality-gates.md) — rationale for the deterministic tools.

## Server, security, deployment

- [Server security](server-security.md) — token, API keys, protected routes, CORS/PNA, **known gaps**.
- [Secrets & configuration](secrets-management.md) — `config.json`, env vars, HTTPS for phones.
- [Deployment](deployment.md) — Cloudflare hosting, Android, Docker, server binaries, tracker.
- [Onboarding FAQ](onboarding-faq.md) — common local-setup problems.
