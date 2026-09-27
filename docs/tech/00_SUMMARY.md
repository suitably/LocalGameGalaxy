# Technical Architecture Index

This directory contains technical documentation and architectural decisions.

* [architecture.md](architecture.md): The Single Source of Truth for the overall system design. Must be updated whenever the architecture changes.
* [melodiq-architecture.md](melodiq-architecture.md): Deep-dive into the Melodiq game module, structure, sync systems, and SOLID refactoring goals.
* [data-models.md](data-models.md): Global and feature-specific data models.
* [secrets-management.md](secrets-management.md): Guidelines for local config.json and SSL setup.
* [testing-guide.md](testing-guide.md): Automated testing setup and mocking procedures.
* [coding-conventions.md](coding-conventions.md): TypeScript styling, naming, anti-God-component ratchet, and anti-pattern matrix.
* [onboarding-faq.md](onboarding-faq.md): Troubleshooting guides for local network testing, HTTPS contexts, and virtual environments.
* [c4-diagrams.md](c4-diagrams.md): C4 system context and container diagrams for the multi-device runtime.
* [sync-protocol.md](sync-protocol.md): Cross-device synchronization protocol and message schemas.
* [webrtc-signaling.md](webrtc-signaling.md): WebRTC signaling connection state machine, tracker, and retries.
* [server-security.md](server-security.md): Server security model, authentication, and SSL architecture.
* [persistence.md](persistence.md): IndexedDB schemas, storage.ts registry, and filesystem storage layout.
* [song-pipeline.md](song-pipeline.md): Song ingestion, download, and vocal separation pipeline.
* [i18n-strategy.md](i18n-strategy.md): Localization strategy and translation namespace architecture.
* [werewolf-architecture.md](werewolf-architecture.md): Werewolf game module: state machine, roles, night resolution, and TTS.
* [styling.md](styling.md): MUI theming, safe area insets, mobile-native CSS, and multi-device layout.
* [qwixx-sheet-rules.md](qwixx-sheet-rules.md): Official rules and layout definitions for all Qwixx score sheet variants.
* [ui-modularization-solid-analysis.md](ui-modularization-solid-analysis.md): Comprehensive cross-game audit of duplicated UI patterns and SOLID modularization.

For progressive disclosure, see [index.md](index.md).
