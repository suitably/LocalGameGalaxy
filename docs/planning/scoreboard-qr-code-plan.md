# Implementation Plan: Scoreboard QR Code Toggle & Display

## Goal Description
Allow the host to toggle whether a QR code is displayed on the score overview (ScoreBoard) screen directly from the "Connect Phones" view (and the Game Settings panel). When enabled, display a clean, scannable QR code on the ScoreBoard screen (both during session results with players and the song-ended empty queue state) so players can join or reconnect at any time during party gameplay.

## Proposed Changes

### 1. Settings State & Persistence
- **File**: `src/games/melodiq/hooks/SettingsContext.tsx`
  - Add `showScoreboardQrCode: boolean` to `SettingsState` interface (default `true`).
  - Update `DEFAULT_SETTINGS`, `loadSettings` (from `melodiq_show_scoreboard_qr_code`), and `persistSettings`.
  - Ensures seamless sync across Host, Tab, and TV windows via `SETTINGS_UPDATE` BroadcastChannel and Presentation events.

### 2. Shared Connection URL Utility
- **File**: `src/components/connection/connectionUrl.ts`
  - Create a helper `buildDeviceConnectionUrl({ baseUrl, clientPath, partyId, trackerUrls })` to centralize URL construction and host resolution (DRY principle).
  - Refactor `DeviceConnection.tsx` to use this utility.

### 3. Connect Phones Screen Toggle
- **File**: `src/components/connection/DeviceConnection.tsx`
  - Add `extraOptions?: React.ReactNode` prop to `DeviceConnectionProps` and render it below connection status / above connection details.
- **File**: `src/games/melodiq/MelodiqConnection.tsx`
  - Connect to `useMelodiqSettings()`.
  - Pass an `extraOptions` toggle card with a switch for `showScoreboardQrCode`, complete with label and description.

### 4. Game Settings Panel Toggle
- **File**: `src/games/melodiq/components/GameSettingsPanel.tsx`
  - Add `showScoreboardQrCode` switch to the settings list for complete configuration options.

### 5. ScoreBoard QR Code Component
- **File**: `src/games/melodiq/gameplay/ScoreBoardQrCode.tsx` (SRP compliant)
  - Create a standalone component for rendering the score screen QR code.
  - Reads `settings.showScoreboardQrCode`. If false, returns `null`.
  - Resolves `partyId` and `activeTrackerUrls` from `useWebRTC()` or `localStorage`.
  - Renders a clean glassmorphic card with a scannable QR code, "Join Session" title, description, and Party ID chip.
  - Supports click/tap to enlarge in a dialog if desired.

### 6. ScoreBoard Screen Integration
- **File**: `src/games/melodiq/gameplay/ScoreBoard.tsx`
  - Integrate `<ScoreBoardQrCode />` in the right column (below All-Time Best ranking) when players are present.
  - Integrate `<ScoreBoardQrCode />` below next song card when `players.length === 0`.
  - Ensure responsive layout across mobile, desktop, and TV display modes.

### 7. Internationalization (i18n)
- **File**: `src/games/melodiq/i18n/index.ts`
  - Add German (`de`) and English (`en`) translation keys for the toggle and QR code labels.

## Verification Plan
1. Run `npm run lint` to verify ESLint compliance.
2. Run `npm run build` (`tsc -b && vite build`) to ensure type safety and bundling correctness.
3. Validate that the toggle in "Connect Phones" updates `showScoreboardQrCode` and that the QR code appears/disappears on the ScoreBoard accordingly.
4. Document the verification results in `docs/verification/scoreboard-qr-code-walkthrough.md`.
