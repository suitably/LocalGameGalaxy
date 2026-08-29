# Implementation Plan: Generalize Helper & Improve GitHub/Docker Integration

## Issues Addressed
- **#97**: Melodiq Helper generalisieren – Rename from "Melodiq Helper" to a general-purpose "Nexumia Server"
- **#98**: GitHub verbinden ohne Melodiq Helper – Direct GitHub integration from the frontend (PAT token stored in localStorage, no server needed for simple GitHub operations like feedback/PR)
- **#99**: Nexumia Link (integrierter Helper) – Generate shareable connection links + admin panel for API key management in Settings
- **#100**: Fehlerhafte Setup für PRs von neuen Wörtern/Kategorien – Fix the broken GuessArt catalogue PR publishing flow

## Architecture Decision: Docker Multi-Stage Builds with Profiles

**Best Practice Answer to the user's Docker question:**

Instead of separate containers per game, use a **multi-stage Dockerfile with build arguments** and a **docker-compose with profiles**:

1. **`base` stage**: Node.js + core server (lightweight, ~200MB) – sufficient for all games except Melodiq's audio features
2. **`melodiq` stage**: Extends base with Python, PyTorch, audio-separator, whisper (heavyweight, ~2GB+) – only needed for vocal separation/alignment
3. Docker Compose profiles: `docker compose --profile melodiq up` for full setup, or just `docker compose up` for the lightweight version

This avoids separate repos/images while keeping the lightweight option available.

## Proposed Changes

### Phase 1: Rename "Melodiq Helper" → "Nexumia Server" (Issue #97)

**Server-side:**
- `server/index.js` – Change log messages from "MELODIQ HELPER" to "NEXUMIA SERVER"
- `server/release-scripts/*` – Rename files and internal references from `melodiq-server` to `nexumia-server`
- `server/package.json` – Update `name` and `pkg` output names
- `.github/workflows/docker-publish.yml` – Update image tag from `melodiq-server` to `nexumia-server`
- `.github/workflows/release_helper.yml` – Update binary names and archive names

**Client-side:**
- `src/lib/storage.ts` – Keep existing localStorage keys for backward compat but add migration comments
- `src/games/melodiq/components/HelperConnection.tsx` → Refactor to shared `src/components/connection/ServerConnection.tsx`
- `src/features/settings/components/MelodiqSettingsCategory.tsx` – Use new shared ServerConnection
- `src/features/settings/Settings.tsx` – Move server connection to General Settings (since it's not Melodiq-specific anymore)
- Translation files (EN + DE) – Update all "Helper Server" strings to "Nexumia Server"

### Phase 2: Direct GitHub Integration (Issue #98)

**Client-side:**
- New `src/lib/github.ts` – GitHub API client that can use either:
  1. A PAT stored locally in `localStorage` (new)
  2. Or proxy through the server (existing behavior)
- `src/features/settings/components/GeneralSettings.tsx` – Add GitHub PAT configuration section
- `src/components/feedback/FeedbackDialog.tsx` – Support direct GitHub API calls (without server)
- `src/games/guessart/logic/catalogueManager.ts` – Support direct GitHub PR creation

**Security considerations:**
- PAT stored in localStorage encrypted with a simple key derived from device fingerprint (pragmatic for local-first app)
- Alternatively: Use sessionStorage + re-enter on session start
- Best practice: Store as plaintext in localStorage with clear warning (it's a local-first app on user's own device)

### Phase 3: Shareable Links & Admin Panel (Issue #99)

**Client-side:**
- New `src/features/settings/components/ServerAdminPanel.tsx` – Admin panel for API key management:
  - List existing API keys
  - Create new API keys with rate limits and permissions
  - Generate shareable connection URLs (contains server URL + API key token)
  - Copy link / generate QR code
- `src/features/settings/Settings.tsx` – Add "Server Admin" tab (only visible when connected as admin/master)

### Phase 4: Fix GuessArt PR Publishing (Issue #100)

**Client-side:**
- `src/games/guessart/logic/catalogueManager.ts` – Add fallback to direct GitHub API if server is unavailable
- Improve error handling and user feedback

### Phase 5: Docker Optimization

**Server-side:**
- `server/Dockerfile` – Multi-stage build with `base` and `full` targets
- `server/docker-compose.yml` – Update with profiles
- `server/docker-compose.dev.yml` – Update accordingly

## Component Hierarchy (SRP)

```
Settings.tsx
├── GeneralSettings.tsx (language, PWA, GitHub PAT config)
├── ServerConnectionTab.tsx (formerly in Melodiq)
│   ├── ServerConnection.tsx (URL + token + test)
│   └── ServerAdminPanel.tsx (API keys, shareable links)
└── MelodiqSettingsCategory.tsx (game-specific only)
```

## Verification Plan
1. `npm run lint` – No new warnings/errors
2. `npm run build` – Clean TypeScript compilation
3. Manual test: Settings page shows server connection in General tab
4. Manual test: GitHub PAT can be configured and used for feedback
5. Manual test: Admin panel shows API keys and generates links
6. Manual test: GuessArt PR publishing works
7. Docker build test: `docker build --target base` and `docker build --target full`
