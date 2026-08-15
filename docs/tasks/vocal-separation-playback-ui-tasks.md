# Task Checklist - Melodiq Vocal Separation Playback UI [ID: TASKS-MELODIQ-VOCAL-PLAYBACK-UI]

- [x] **Phase 1: Backend Stem Scanning & Metadata**
  - [x] Update `server/src/services/scanner.js` to parse `#ORIGINAL`, `#INSTRUMENTAL`, `#VOCALS` and scan song directories for multi-stem tracks
  - [x] Update `server/src/controllers/songController.js` to serve secure URLs for `originalAudio`, `instrumentalAudio`, `vocalsAudio`, `hasSeparation`
  - [x] Update `server/src/services/separator.js` to write `#ORIGINAL` tag on separation
  - [x] Update `server/public/index.html` to display `🎤 Stems` badge on local songs
- [x] **Phase 2: Frontend Data Models, Hooks & Settings**
  - [x] Update `src/games/melodiq/db.ts` with `originalAudio`, `instrumentalAudio`, `vocalsAudio`, `hasSeparation`
  - [x] Update `src/games/melodiq/hooks/useSongs.tsx` to process multi-stem URLs and cache them
  - [x] Update `src/games/melodiq/hooks/SettingsContext.tsx` with `audioPlaybackMode: 'separated' | 'original'`
  - [x] Update `src/games/melodiq/i18n/index.ts` with complete German and English translations
- [x] **Phase 3: Audio Loading & In-Game Playback UI**
  - [x] Update `src/games/melodiq/gameplay/hooks/useMediaLoaders.ts` to support switching between separated stems and original audio
  - [x] Update `src/games/melodiq/gameplay/MelodiqSession.tsx` to support seamless audio loading driven by settings
  - [x] Update `src/games/melodiq/components/GameSettingsPanel.tsx` to include Audio Playback Mode selection
  - [x] Update `src/games/melodiq/components/SongListItem.tsx` and `SongCard.tsx` with `🎤 Stems` badge
- [x] **Phase 4: Bugfixes, Compilation & Linting**
  - [x] Fix TS7006 in `src/games/melodiq/MelodiqTV.tsx`
  - [x] Export components in `src/games/melodiq/index.ts` to satisfy `no-restricted-imports`
  - [x] Resolve lint issue in `src/games/melodiq/hooks/useQueue.ts`
  - [x] Run `npm run lint` and `npm run build` to verify clean build
- [x] **Phase 5: Verification & Architecture Documentation**
  - [x] Create `docs/verification/vocal-separation-playback-ui-walkthrough.md`
  - [x] Update `docs/tech/architecture.md`, `docs/tech/melodiq-architecture.md`, and `docs/tech/song-pipeline.md`

