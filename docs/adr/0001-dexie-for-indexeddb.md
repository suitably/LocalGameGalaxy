---
type: Architecture Decision Record
title: 'ADR-0001: Dexie for IndexedDB Management'
description: Decision to use Dexie.js for client-side IndexedDB database access, migrations, and reactive hooks.
resource: src/lib/
tags: [adr, indexeddb, dexie, offline-first]
status: stable
generated: { by: antigravity/2.0, at: 2026-09-27T10:00:00Z }
verified: { by: process:ci, at: 2026-09-27T10:00:00Z }
---

# ADR-0001: Use Dexie as the IndexedDB Abstraction Layer

## Status
Accepted

## Context
LocalGameGalaxy needs persistent, structured client-side storage for song libraries (thousands of records with metadata), game session history, word categories for Imposter, and custom Werewolf role definitions. The native IndexedDB API is verbose, callback-based, and requires significant boilerplate for schema migrations and typed queries.

## Decision
Use **Dexie.js** (`dexie` v4) as the IndexedDB wrapper for all client-side persistent storage, with React bindings via `dexie-react-hooks`.

## Alternatives Considered
- **Raw IndexedDB API**: Too verbose; schema migrations and transactional code are error-prone.
- **localForage**: Simpler API but no relational query support, no TypeScript-first design, and limited migration tooling.
- **PouchDB**: Full-featured but brings CouchDB-style replication overhead that is unnecessary for this offline-first use case.

## Consequences
**Positive**:
- Declarative schema with version-based migrations.
- Promise-based API with full TypeScript support.
- `useLiveQuery()` hook enables reactive data binding directly in React components.
- Lightweight (< 30 KB gzipped).

**Negative**:
- Dexie is an additional dependency; IndexedDB support varies slightly across mobile browsers.
- Each database is isolated; cross-database joins require application-level code.
