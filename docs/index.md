---
okf_version: "0.2"
---

# LocalGameGalaxy Knowledge Bundle

Welcome to the **LocalGameGalaxy Open Knowledge Bundle**. This corpus contains the technical architecture, specifications, operational runbooks, architecture decision records, and development workflows for LocalGameGalaxy.

## Knowledge Domains

* [Technical Architecture & System Design](tech/) - Single Source of Truth for core architecture, game engines, shared modules, persistence, and synchronization.
* [Workflows & Pipelines](workflows/) - Continuous integration, automated deployment, Google Jules autonomous agent pipelines, and SOLID refactoring workflows.
* [Architecture Decision Records (ADRs)](adr/) - Immutable architectural decisions covering Dexie, BitTorrent signaling, Capacitor, and PyTorch Demucs.
* [Operations & DevOps Runbooks](operations/) - Server deployment, Capacitor Android releases, monitoring, troubleshooting, and backup procedures.
* [Backend Simplification Issues](issues/backend-simplification/) - Specifications for the Hono micro-kernel migration and backend streamlining.
* [Task Packages & Feature Backlog](tasks/) - Agent-ready tasks for SOLID modularization and the virtual tabletop engine.

## Core Reference Concepts

* [System Architecture](tech/architecture.md) - The authoritative Single Source of Truth (SSoT) for the entire project.
* [Cross-Device Synchronization Protocol](tech/sync-protocol.md) - Multi-channel sync, MQTT mailbox patterns, WebRTC, and Web Push notifications.
* [Data Persistence Layer](tech/persistence.md) - Centralized `storage.ts` service and IndexedDB schemas.
* [Coding Conventions & Anti-God-Component Rules](tech/coding-conventions.md) - 250-line component budget, decomposition pattern, and anti-pattern matrix.
