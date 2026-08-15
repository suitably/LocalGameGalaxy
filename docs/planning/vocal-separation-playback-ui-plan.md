# Implementation Plan - Melodiq Vocal Separation Playback UI [ID: PLAN-MELODIQ-VOCAL-PLAYBACK-UI]

## 1. Goal Description
The user added vocal separation functionality to Melodiq. The goal is to provide a setting and in-game UI control that allows players to choose whether they want to hear the vocal separation (separated instrumental stem + separated vocal stem, enabling independent vocal volume control) or the original audio track (the untouched original full mix without separation artifacts). The implementation must maintain the clean separation between Backend and Frontend.

---

## 2. Component Hierarchy & Architectural Design (SOLID / SRP)

```
Backend (/server)
├── scanner.js             [SRP: Scans & caches song metadata, detecting original, instrumental, and vocal stems]
├── songController.js      [SRP: Serves secure media URLs for audio, originalAudio, instrumentalAudio, vocalsAudio, hasSeparation]
├── separator.js           [SRP: Executes audio separation and writes #ORIGINAL, #INSTRUMENTAL, #VOCALS headers]
└── public/index.html      [SRP: Server web interface showing song stem badges]

Frontend (/src/games/melodiq)
├── db.ts                  [SRP: Strongly-typed Song & SongMeta interfaces with multi-stem fields]
├── i18n/index.ts          [SRP: Full German & English localization for playback mode and stem badges]
├── hooks/
│   ├── useSongs.tsx       [SRP: Song library data provider mapping backend stem URLs]
│   └── SettingsContext.tsx[SRP: Global user settings holding `audioPlaybackMode: 'separated' | 'original'`]
├── gameplay/
│   ├── hooks/
│   │   ├── useMediaLoaders.ts   [SRP: Resolves correct audioSrc & vocalsSrc based on audioPlaybackMode & stem availability]
│   │   └── usePlaybackControls.ts [SRP: Audio playback control with volume management]
│   └── MelodiqSession.tsx [SRP: Main gameplay container with in-game audio mode toggle button in top bar]
├── components/
│   ├── GameSettingsPanel.tsx      [SRP: Settings UI with Audio Playback Mode options]
│   ├── SongListItem.tsx           [SRP: Renders song list row with stem badge]
│   └── SongCard.tsx               [SRP: Renders song grid card with stem badge]
└── features/settings/
    └── components/MelodiqSettingsCategory.tsx [SRP: Global settings tab for Melodiq]
```

---

## 3. Proposed Changes

### Backend (`server/`)
1. **[server/src/services/scanner.js](file:///home/deck/Projects/LocalGameGalaxy/server/src/services/scanner.js)**:
   - Parse `#ORIGINAL:`, `#ORIGINALAUDIO:`, `#INSTRUMENTAL:`, `#VOCALS:`, `#MP3:` headers.
   - Detect non-instrumental/non-vocal audio file in the song folder if `#ORIGINAL` is not explicitly tagged.
   - Set `originalAudio`, `instrumentalAudio`, `vocalsAudio`, and `hasSeparation` boolean on cached song objects.
2. **[server/src/controllers/songController.js](file:///home/deck/Projects/LocalGameGalaxy/server/src/controllers/songController.js)**:
   - Map `originalAudio`, `instrumentalAudio`, `vocalsAudio`, and `hasSeparation` through `secureUrl()` in `toClientSong` and `getSongById`.
3. **[server/src/services/separator.js](file:///home/deck/Projects/LocalGameGalaxy/server/src/services/separator.js)**:
   - When writing `.txt` after separation, write `#ORIGINAL:${path.basename(audioPath)}`, `#INSTRUMENTAL:${instrumentalFile}`, `#VOCALS:${vocalsFile}`, `#MP3:${instrumentalFile}`.
4. **[server/public/index.html](file:///home/deck/Projects/LocalGameGalaxy/server/public/index.html)**:
   - Add `🎤 Stems` badge in the local songs list when `song.hasSeparation` or `song.vocalsAudio` is present.

### Frontend (`src/`)
1. **[src/games/melodiq/db.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/db.ts)**:
   - Add `originalAudio`, `instrumentalAudio`, `vocalsAudio`, `hasSeparation` to `Song` and `SongMeta`.
2. **[src/games/melodiq/hooks/useSongs.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/hooks/useSongs.tsx)**:
   - Map server stem URLs with token authentication and compute `hasSeparation`.
3. **[src/games/melodiq/hooks/SettingsContext.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/hooks/SettingsContext.tsx)**:
   - Add `audioPlaybackMode: 'separated' | 'original'` to `SettingsState` (default `'separated'`).
   - Persist to `localStorage.getItem('melodiq_audio_playback_mode')`.
4. **[src/games/melodiq/gameplay/hooks/useMediaLoaders.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/hooks/useMediaLoaders.ts)**:
   - Accept `audioPlaybackMode`.
   - In `'separated'` mode: load instrumental on `audioSrc` and vocals on `vocalsSrc` (if stems exist).
   - In `'original'` mode: load original audio on `audioSrc` and set `vocalsSrc` to `undefined`.
   - Return `hasSeparation`.
5. **[src/games/melodiq/gameplay/MelodiqSession.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/MelodiqSession.tsx)**:
   - Add an on-the-fly Audio Mode toggle button in the top bar when the active song has separation available.
   - Smoothly update audio playback mode while preserving current playback timestamp.
6. **[src/games/melodiq/components/GameSettingsPanel.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/components/GameSettingsPanel.tsx)**:
   - Add "Audio Playback Mode" selection (Separated Stems vs Original Audio) with helper description.
7. **[src/games/melodiq/components/SongListItem.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/components/SongListItem.tsx)** & **[SongCard.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/components/SongCard.tsx)**:
   - Display a `🎤 Stems` badge when `song.hasSeparation` is true.
8. **[src/games/melodiq/i18n/index.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/i18n/index.ts)**:
   - Add all English and German translations for audio playback mode, descriptions, tooltips, and badges.
9. **Compilation & Linting fixes**:
   - Fix TS7006 in `MelodiqTV.tsx`.
   - Export components in `src/games/melodiq/index.ts` to satisfy `no-restricted-imports`.
   - Fix ref access during render in `useQueue.ts`.

---

## 4. Verification Plan

### Automated / Build Verification
1. `npm run lint` - zero errors.
2. `npm run build` - TypeScript compilation (`tsc -b`) and Vite bundle build succeed with zero errors.

### Functional Verification
1. Check that `scanner.js` correctly detects original, instrumental, and vocal stems.
2. Verify that `/api/songs` response includes `originalAudio`, `instrumentalAudio`, `vocalsAudio`, `hasSeparation`.
3. Verify settings UI in German and English.
4. Verify `useMediaLoaders` switches between original audio and separated stems based on `audioPlaybackMode`.
5. Verify in-game toggle in `MelodiqSession.tsx` switches audio stream seamlessly.
