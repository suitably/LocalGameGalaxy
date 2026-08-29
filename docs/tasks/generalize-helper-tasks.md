# Tasks: Generalize Helper & Improve GitHub/Docker Integration

## Phase 1: Rename "Melodiq Helper" → "Nexumia Server" (#97)
- [x] Update `server/index.js` log messages
- [x] Update `server/package.json` name + pkg config
- [x] Rename `server/release-scripts/` files and content
- [x] Update `.github/workflows/docker-publish.yml` image tags
- [x] Update `.github/workflows/release_helper.yml` binary names
- [x] Move HelperConnection from melodiq to shared components (`src/components/connection/ServerConnection.tsx`)
- [x] Update Settings.tsx to show Server Connection in dedicated "Server" tab
- [x] Update translation files (EN + DE)

## Phase 2: Direct GitHub Integration (#98)
- [x] Create `src/lib/github.ts` client module
- [x] Add GitHub PAT config UI in GeneralSettings (`src/features/settings/components/GitHubSettings.tsx`)
- [x] Update FeedbackDialog to support direct GitHub API calls
- [x] Update catalogueManager for direct GitHub fallback

## Phase 3: Shareable Links & Admin Panel (#99)
- [x] Create ServerAdminPanel component (`src/components/connection/ServerAdminPanel.tsx`)
- [x] Add admin tab/section to Settings
- [x] Implement shareable link and QR code generation for API keys

## Phase 4: Fix GuessArt PR Publishing (#100)
- [x] Debug and fix catalogue publishing flow in `src/games/guessart/logic/catalogueManager.ts`
- [x] Add direct GitHub fallback for PR creation with local PAT

## Phase 5: Docker Optimization
- [x] Create multi-stage Dockerfile with `base` and `full` targets
- [x] Update `docker-compose.yml` with profiles (`base` default, `melodiq` profile for `full`)
- [x] Update `docker-compose.dev.yml`

## Phase 6: Verification
- [x] `npm run lint` (0 errors)
- [x] `npm run build` (`tsc -b && vite build` succeeded)
- [x] `npm run test` (17 tests passed)
- [x] Create walkthrough document
