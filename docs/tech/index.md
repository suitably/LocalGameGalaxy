# Technical Architecture & System Concepts

This directory contains technical architecture documents, subsystem designs, and data specifications for LocalGameGalaxy.

## Core System Design (SSoT)

* [System Architecture](architecture.md) - Single Source of Truth for system architecture, game engines, shared modules, and server infrastructure.
* [System Context & Container Diagrams (C4)](c4-diagrams.md) - C4 Model context and container diagrams for multi-device runtime topologies.
* [Coding Conventions & Anti-God-Component Architecture](coding-conventions.md) - 250-line component budget, decomposition pattern, and anti-pattern matrix.
* [Core Data Models Specification](data-models.md) - Central specification for application data models, game state schemas, and sync envelopes.
* [Data Persistence Layer Architecture](persistence.md) - Central storage service, STORAGE_KEYS, and IndexedDB schemas.
* [Cross-Device Synchronization Protocol](sync-protocol.md) - MQTT mailbox patterns, MultiChannelSync, WebRTC DataChannels, and Web Push notifications.
* [WebRTC Signaling & Connection Architecture](webrtc-signaling.md) - Peer-to-peer signaling state machine, BitTorrent tracker, and ICE candidate exchange.

## Subsystem & Game Architecture

* [Melodiq Karaoke Architecture](melodiq-architecture.md) - Architectural specification of the Melodiq karaoke module, dual-path video sync, and pitch evaluation.
* [Werewolf Game Module Architecture](werewolf-architecture.md) - Architecture of the Werewolf moderator engine, role state machines, and night resolution order.
* [Qwixx Spielvarianten & Sheet-Regelwerk](qwixx-sheet-rules.md) - Rules, scoring matrices, and layout definitions for official Qwixx expansions.
* [Song Ingestion & Vocal Separation Pipeline](song-pipeline.md) - Pipeline for song downloads, lyrics extraction, and AI vocal separation via Demucs / ONNX.
* [UI- & Logik-Modularisierungsanalyse & SOLID-Leitfaden](ui-modularization-solid-analysis.md) - Cross-game audit of UI patterns, duplication elimination, and God Component refactoring.

## Security & Deployment

* [Server Security Model & Authentication](server-security.md) - Bearer token enforcement, CORS headers, Private Network Access (PNA), and TLS termination.
* [Secrets & Local Configuration Management](secrets-management.md) - Managing local tokens, certificates, config.json, and HTTPS development contexts.
* [Deployment Architecture & Multi-Platform Packaging](deployment.md) - Deployment targets including SPA web hosting, Android packaging via Capacitor, and Docker companion backend.
* [Styling, Theme & Multi-Device Layout Architecture](styling.md) - MUI theming conventions, dark/light palette tokens, Capacitor safe area insets, and responsive layout.
* [i18n Strategy & Translation Namespace Architecture](i18n-strategy.md) - Internationalization guidelines, translation key structures, and bilingual parity enforcement.
* [Testing Guide & Quality Assurance Patterns](testing-guide.md) - Vitest unit testing setup, mocking strategies, and coverage requirements.
* [Developer Onboarding FAQ & Troubleshooting Guide](onboarding-faq.md) - Solutions for local development setup, secure context configuration, and common developer pitfalls.
* [LocalGameGalaxy Agent Factory](agent-factory.md) - Autonomous development pipeline pooling multiple AI accounts with strict quality gates.
