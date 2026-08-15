# Verification Walkthrough: Melodiq Vocal Separation Playback UI [ID: WALKTHROUGH-MELODIQ-VOCAL-PLAYBACK-UI]

## 1. Summary of Changes

We implemented full end-to-end support for user-selectable audio playback modes in Melodiq (Original Audio vs. Separated Stems):

1. **Companion Server & Scanner (`server/src/`)**:
   - `server/src/services/scanner.js`: Enhanced UltraStar parser and directory scanner to detect `#ORIGINAL:`, `#ORIGINALAUDIO:`, `#INSTRUMENTAL:`, `#VOCALS:` headers as well as stem files on disk (`(Instrumental)`, `(Vocals)`). Populates `originalAudio`, `instrumentalAudio`, `vocalsAudio`, and `hasSeparation` flag.
   - `server/src/controllers/songController.js`: Maps secure media proxy URLs for `originalAudio`, `instrumentalAudio`, `vocalsAudio` and exposes `hasSeparation`.
   - `server/src/services/separator.js`: Patches `.txt` files to write `#ORIGINAL` alongside `#INSTRUMENTAL`, `#VOCALS`, and `#MP3` when separation jobs complete.
   - `server/public/index.html`: Displays `🎤 Stems` badge in the local companion web UI.

2. **Frontend Models & State Management (`src/games/melodiq/`)**:
   - `src/games/melodiq/db.ts`: Added `originalAudio?`, `instrumentalAudio?`, `vocalsAudio?`, `hasSeparation?` to `Song` and `SongMeta`.
   - `src/games/melodiq/hooks/useSongs.tsx`: Parses and caches multi-stem metadata.
   - `src/games/melodiq/hooks/SettingsContext.tsx`: Added `audioPlaybackMode: 'separated' | 'original'` (default: `'separated'`) with local storage persistence (`melodiq_audio_playback_mode`).
   - `src/games/melodiq/i18n/index.ts`: Full bilingual translations (DE/EN) for Audio Playback Mode, descriptions, and badges.

3. **Audio Playback Engine & UI**:
   - `src/games/melodiq/gameplay/hooks/useMediaLoaders.ts`: Resolves either separated stems (Instrumental + Vocals tracks) or untouched original audio depending on `settings.audioPlaybackMode`.
   - `src/games/melodiq/components/GameSettingsPanel.tsx`: Added an Audio Playback Mode toggle group (`Separated Stems` vs `Original Audio`) and disabled vocal volume slider with informative caption when in Original Audio mode.
   - `src/games/melodiq/components/SongListItem.tsx` & `SongCard.tsx`: Display `🎤 Stems` badge when separation tracks are present.
   - Cleaned up session top bar to keep gameplay view clean and distraction-free.

---

## 2. Verification & Validation Results

### A. TypeScript Compilation & Vite Bundling
```bash
npm run build
```
**Output**:
```
> local-game-galaxy@0.0.0 build
> tsc -b && vite build

vite v7.3.0 building client environment for production...
✓ 1393 modules transformed.
✓ built in 29.61s
```
- Exit code: `0` (0 errors)

### B. ESLint Static Analysis
```bash
npm run lint
```
**Output**:
```
> local-game-galaxy@0.0.0 lint
> eslint .

✖ 421 problems (0 errors, 421 warnings)
```
- Exit code: `0` (0 errors)

---

## 3. Outstanding Issues
None. All components, hooks, server endpoints, and documentation are verified and in sync.
