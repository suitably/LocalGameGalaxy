# Data Persistence Layer Architecture [ID: TECH-PERSISTENCE]

> [!IMPORTANT]
> This document is the Single Source of Truth for all browser-side and server-side data storage in LocalGameGalaxy. Update this document whenever a new database table, localStorage key, or storage mechanism is added.

---

## 1. Overview

LocalGameGalaxy fragments its storage across several browser mechanisms depending on the data's lifetime and access pattern:

| Mechanism | Library | Scope | Persistence |
|-----------|---------|-------|-------------|
| IndexedDB (`LocalGameGalaxyDB`) | Dexie 4 | App-wide game data | Permanent |
| IndexedDB (`MelodiqDB`) | Dexie 4 | Melodiq song library | Permanent |
| `localStorage` | Native | Settings & session state | Permanent |
| `sessionStorage` | Native | Temporary UI cache | Tab lifetime |
| Server Filesystem | Node.js `fs` | Audio files, lyrics | Permanent |

---

## 2. IndexedDB: `LocalGameGalaxyDB`

Managed by Dexie. Contains general game-hub data shared across all games.

### Tables

| Table | Primary Key | Indexed Fields | Purpose |
|-------|-------------|----------------|---------|
| `wordCategories` | `id` (auto) | `name`, `language` | Stores Imposter word category definitions |
| `wordPairs` | `id` (auto) | `categoryId` | Word pairs belonging to a category |
| `werewolfSessions` | `id` (auto) | `createdAt` | Archived Werewolf game session history |

### Schema Version Policy
Dexie uses integer version numbers. When adding or modifying a table, increment the version and provide a migration upgrade function:
```typescript
db.version(2).stores({
  wordCategories: '++id, name, language',
  wordPairs: '++id, categoryId',
  werewolfSessions: '++id, createdAt',
}).upgrade(tx => { /* migration logic */ });
```

---

## 3. IndexedDB: `MelodiqDB`

Managed by Dexie. Contains all Melodiq-specific song library data.

### Tables

| Table | Primary Key | Indexed Fields | Purpose |
|-------|-------------|----------------|---------|
| `songs` | `id` (UUID string) | `title`, `artist`, `hasVocals` | Song metadata and processing status |
| `playlists` | `id` (auto) | `name` | User-defined ordered song lists |
| `playlistItems` | `id` (auto) | `playlistId`, `songId` | Join table for playlist ↔ song |
| `songHistory` | `id` (auto) | `songId`, `playedAt` | Per-song play history and high scores |

### Song Processing States
Each `song` record tracks its ingestion progress:
```typescript
type SongStatus =
  | 'pending'        // Just added, not yet downloaded
  | 'downloading'    // yt-dlp in progress
  | 'downloaded'     // Audio file on disk, no separation
  | 'separating'     // Demucs running
  | 'ready'          // Vocals and instrumentals available
  | 'error';         // Processing failed
```

---

## 4. `localStorage` Keys

| Key | Type | Written By | Purpose |
|-----|------|------------|---------|
| `melodiq_active_session` | `ActiveSession \| null` | Host, Phone recovery | Persists active game state across tab refreshes |
| `melodiq_settings` | `MelodiqSettings` | Settings UI | User preferences (mic latency offset, default video mode) |
| `lgg_theme` | `'dark' \| 'light'` | Theme toggle | Global app theme selection |
| `lgg_language` | `'en' \| 'de'` | Language selector | i18n language preference |
| `werewolf_custom_roles` | `RoleDefinition[]` | Werewolf role editor | Persisted custom role definitions |

> [!WARNING]
> The `melodiq_active_session` key is read and written by multiple code paths (Host session restore and Phone Client reconnection). A strict versioned schema with a `version` field must be enforced to prevent deserialization conflicts. See issue #20.

---

## 5. Server Filesystem Storage

The companion server stores all media files on the host's local filesystem. Paths are configured in `config.json` under `directories`.

```
<configured_directory>/
├── <song-id>/
│   ├── audio.mp3          # Original downloaded audio
│   ├── vocals.mp3         # Separated vocals stem
│   ├── instrumental.mp3   # Separated instrumental stem
│   └── lyrics.txt         # UltraStar .txt lyric file
```

> [!NOTE]
> The server **never stores user data** (no accounts, no passwords). All data is either on the local filesystem or in the browser's IndexedDB.
