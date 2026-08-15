# Verification Walkthrough: Scoreboard QR Code Toggle & Display

## Changes Implemented
1. **Settings Context**:
   - Added `showScoreboardQrCode: boolean` to `SettingsState` in [`SettingsContext.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/hooks/SettingsContext.tsx) (default: `true`).
   - Persists state to `localStorage` (`melodiq_show_scoreboard_qr_code`) and broadcasts updates over `BroadcastChannel` and presentation connections.
2. **Centralized Connection URL Helper**:
   - Created [`connectionUrl.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/components/connection/connectionUrl.ts) with `buildDeviceConnectionUrl` and test suite in [`connectionUrl.test.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/components/connection/connectionUrl.test.ts).
   - Refactored [`DeviceConnection.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/components/connection/DeviceConnection.tsx) to reuse the shared helper and support an `extraOptions` prop.
3. **Toggle on Connect Phones Screen & Settings**:
   - In [`MelodiqConnection.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/MelodiqConnection.tsx), added a dedicated switch card for `showScoreboardQrCode`.
   - In [`GameSettingsPanel.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/components/GameSettingsPanel.tsx), added the `showScoreboardQrCode` switch to the main settings.
4. **Scoreboard QR Code Component & Integration**:
   - Created [`ScoreBoardQrCode.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/ScoreBoardQrCode.tsx) following SRP.
   - Integrated into [`ScoreBoard.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/ScoreBoard.tsx) across active player results and empty queue states.
5. **Internationalization (i18n)**:
   - Added English and German localization entries to [`src/games/melodiq/i18n/index.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/i18n/index.ts).

## Verification Results
- **Unit Tests**: Executed `vitest run` — all tests in `connectionUrl.test.ts` passed:
  ```
  Test Files  1 passed (1)
       Tests  2 passed (2)
  ```
- **Lint**: Executed `eslint .` — 0 errors found.
- **Build**: Executed `tsc -b && vite build` — compilation and production bundling succeeded with 0 errors.

## Outstanding Issues
- None.
