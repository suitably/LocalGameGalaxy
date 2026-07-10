# Phase 2 Walkthrough: Architectural Documentation [ID: VERIFY-PHASE2-ARCH-DOCS]

## Changes Implemented

### #61 — C4 System Context & Container Diagrams
- Created `docs/tech/c4-diagrams.md`
- C4 Context diagram: all external actors (YouTube, USDB, BitTorrent tracker, Demucs) and their relationships
- C4 Container diagram: React SPA, IndexedDB, localStorage, Helper Server, local BitTorrent tracker
- WebRTC peer connection sequence diagram

### #62 — Cross-Device Synchronization Protocol
- Created `docs/tech/sync-protocol.md`
- Documents all 4 communication channels (BroadcastChannel, Presentation API, WebRTC DataChannel, DOM Events)
- Full TypeScript payload schemas for: `PLAY_SONG`, `STOP_SONG`, `GAME_STATE`, `PING`
- WebRTC DataChannel message table: Host→Phone and Phone→Host
- localStorage session key documentation

### #65 — Server Security Model
- Created `docs/tech/server-security.md`
- SSL/HTTPS self-signed certificate architecture
- Bearer token authentication middleware
- API key rate-limit bypass system
- CORS configuration matrix
- `express-rate-limit` setup details

### #66 — Data Persistence Layer
- Created `docs/tech/persistence.md`
- `LocalGameGalaxyDB` schema (wordCategories, wordPairs, werewolfSessions)
- `MelodiqDB` schema (songs, playlists, playlistItems, songHistory) with SongStatus lifecycle
- localStorage key inventory with owner and purpose
- Dexie version/migration policy
- Server filesystem directory layout

### #60 — ADR System
- Created `docs/adr/00_SUMMARY.md` with ADR index and template
- ADR-0001: Dexie for IndexedDB
- ADR-0002: BitTorrent tracker for WebRTC signaling
- ADR-0003: Capacitor for Android packaging
- ADR-0004: PyTorch/Demucs for vocal separation

### #63 — Song Ingestion Pipeline
- Created `docs/tech/song-pipeline.md`
- 4-stage pipeline diagram: USDB scrape → yt-dlp download → Demucs separation → lyric alignment
- Per-stage technical details and subprocess architecture
- Filesystem layout per song
- REST API endpoint table

### #67 — i18n Strategy
- Created `docs/tech/i18n-strategy.md`
- Technology stack (i18next v25, react-i18next v16, i18next-http-backend)
- Supported locales and directory structure
- Top-level key namespace structure (app, games, settings, common, feedback)
- Mandatory workflow for adding new translation keys
- Interpolation and pluralization patterns

### #69 — Werewolf Architecture
- Created `docs/tech/werewolf-architecture.md`
- Full component hierarchy
- GameState shape and all type definitions
- Phase flow state machine diagram (mermaid stateDiagram)
- Night action resolution order (protection → kill → heal → infect → burn → death cascade → win check)
- Win condition table (all 10 factions)
- Custom role system (`RoleDefinition`, `inheritsFrom`)
- TTS integration description

### #64 — Deployment Architecture
- Created `docs/tech/deployment.md`
- 3 deployment modes: Vite web, Capacitor Android, companion server
- Docker and `docker compose` usage
- Standalone binary packaging via `pkg`

### #68 — Styling Architecture
- Created `docs/tech/styling.md`
- MUI v7 theming conventions (`sx` vs `styled()` vs CSS variables)
- Multi-device layout table (PC, phone, TV)
- Edge-to-edge safe area CSS pattern for Capacitor/Android
- Mobile-native CSS resets (`user-select`, `tap-highlight`, `overscroll-behavior`)

---

## Verification Results

| Check | Ergebnis |
|-------|----------|
| `npm run build` | ✅ 0 Errors — PWA bundle, 25 precache entries |
| `npm run lint` | ✅ 0 Errors |
| GitHub Issues #60–#69 | ✅ Alle 10 geschlossen |
| `docs/tech/00_SUMMARY.md` | ✅ Alle 10 neuen Docs verlinkt |
| `docs/adr/` Verzeichnis | ✅ 4 ADRs + Index erstellt |

## Outstanding Issues

Keine offenen Punkte für Phase 2. Alle 10 Issues abgeschlossen.

Nächster Schritt: **Phase 3 — Code-Level Documentation** (Issues #46–#59).
