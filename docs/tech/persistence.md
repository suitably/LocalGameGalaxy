---
type: Technical Specification
title: Data Persistence Layer Architecture
description: Single Source of Truth for browser-side storage, IndexedDB databases, and centralized storage services.
resource: src/lib/storage.ts
tags: [storage, persistence, indexeddb, dexie, localstorage]
status: stable
generated: { by: antigravity/2.0, at: 2026-09-27T10:00:00Z }
verified: { by: process:ci, at: 2026-09-27T10:00:00Z }
sources:
  - id: storage-service
    resource: src/lib/storage.ts
    title: Centralized Storage Service
  - id: agy-rules
    resource: /AGENTS.md
    title: Agent Guidelines & Zero Raw Storage Policy
---

# Data Persistence Layer Architecture

> [!IMPORTANT]
> This document is the Single Source of Truth for all browser-side and server-side data storage in LocalGameGalaxy. Update this document whenever a new database table, `STORAGE_KEYS` entry, or storage mechanism is introduced.

---

## 1. Storage Architecture Overview

LocalGameGalaxy enforces an **offline-first** persistence architecture. Direct calls to `window.localStorage` and `window.sessionStorage` are strictly prohibited (enforced via CI and `scripts/check-architecture.mjs`). All client state is persisted through typed wrappers and IndexedDB databases:

| Mechanism | Technology | Scope | Purpose |
|-----------|------------|-------|---------|
| **Central Storage Service** | `src/lib/storage.ts` (`storage.get/set`) | App preferences & active session recovery | Key-value settings with in-memory fallback |
| **`guessart-local`** | IndexedDB (`async-game` helpers) | Drawing rounds, game logs, catalogues | GuessArt game state & catalogues |
| **`storyteller-local`** | IndexedDB (`async-game` helpers) | Collaborative stories & turn logs | Geschichtenschreiber stories |
| **`MelodiqDB`** | Dexie 4 | Songs, playlists, history | Melodiq karaoke song library |
| **`melodiq-notes-local`** | IndexedDB / Dexie | MusicXML & MXL sheets | Melodiq Notes sheet music library |
| **`galaxy_tabletop_db`** | Dexie 4 | PlayingCards.io definitions & assets | Virtual Tabletop imported games |
| **Server Filesystem** | Node.js `fs` | Audio files, separated vocal stems | Melodiq companion server storage |

---

## 2. IndexedDB Databases

### 2.1 `guessart-local`
Managed via `src/modules/async-game` runners (`createIdbStoreOperations`, `runWithStore`):
- `games`: Active and past GuessArt session snapshots.
- `rounds`: Drawing strokes, word mask, hints, and guess logs.
- `catalogues`: Custom bilingual category and word definitions edited in `CatalogueEditorDialog`.
- `metadata`: Schema versions and catalogue timestamps.

### 2.2 `storyteller-local`
Managed via `src/modules/async-game` runners:
- `games`: Story metadata, modifiers (Blind Mode, Time Attack, Word Roulette), and participants.
- `entries`: Individual submitted story turns and chapter fragments.

### 2.3 `MelodiqDB`
Managed via Dexie 4:
- `songs`: UltraStar parsed metadata, status (`pending`, `downloading`, `downloaded`, `separating`, `ready`, `error`).
- `playlists`: User-defined song playlists.
- `playlistItems`: Join table connecting playlists and songs.
- `songHistory`: Play counts, timestamps, and high scores.

### 2.4 `melodiq-notes-local`
Stores local MusicXML / MXL files, track stems, and user practice tempos for the interactive sheet music visualizer.

### 2.5 `galaxy_tabletop_db`
Stores unzipped PlayingCards.io (`.pcio` / `.json`) game packages:
- Game metadata, custom board backgrounds, card templates, widget geometries, and deck definitions.

---

## 3. Central Storage Service (`src/lib/storage.ts`)

All non-relational settings and transient game tokens must use `storage` methods:
```typescript
import { storage, STORAGE_KEYS } from '../lib/storage';

// Safe get with fallback
const settings = storage.get(STORAGE_KEYS.MELODIQ_SETTINGS, defaultSettings);

// Type-safe set with quota error handling
storage.set(STORAGE_KEYS.SIGNALING_URL, 'wss://...');

// Clean removal
storage.remove(STORAGE_KEYS.ACTIVE_SESSION);
```

### Key Storage Domains in `STORAGE_KEYS`

| Category | Typical Keys | Description |
|----------|--------------|-------------|
| **Companion Server** | `HELPER_URL`, `HELPER_TOKEN`, `HELPER_ACTIVE`, `SIGNALING_URL` | Micro-kernel connectivity & tokens |
| **Melodiq Session** | `ACTIVE_SESSION`, `NOW_PLAYING`, `QUEUE`, `MELODIQ_SETTINGS`, `MIC_SLOTS` | Karaoke session & audio latency offsets |
| **Social Deduction** | `WEREWOLF_STATE`, `WEREWOLF_CUSTOM_ROLES`, `IMPOSTER_SETTINGS` | Werewolf & Imposter setups |
| **Push Notifications**| `PUSH_RELAY_URL`, `NOTIFICATION_METHOD`, `NTFY_SERVER_URL`, `NTFY_TOPIC` | Web Push / ntfy preferences |
| **Puzzle Games** | `SUDOKU_STATE`, `SUDOKU_STATS`, `WORDLE_STATE` | Daily puzzle state & streaks |
| **GitHub Integration**| `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO` | Personal Access Token for PR publishing |

---

## 4. Server Filesystem Storage

The companion server stores media files in the directory configured by `MUSIC_DIR` (or `server/music/`):
```
<music_directory>/
├── <song-id>/
│   ├── audio.mp3          # Original downloaded audio track
│   ├── vocals.mp3         # Separated vocals stem (Demucs / ONNX)
│   ├── instrumental.mp3   # Separated instrumental stem
│   ├── video.mp4          # Optional background video (HTTP 206 streaming)
│   └── lyrics.txt         # UltraStar format text lyrics
```
> [!NOTE]
> The server stores no credentials or PII. Media directories are strictly kept out of Git via `.gitignore`.
