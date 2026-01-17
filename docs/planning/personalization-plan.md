# Player Personalization Plan

## Goal Description
Allow users to set a custom **Username** and **Color** for Player 1 and Player 2.
These settings will be persisted and reflected in the game session.

## User Review Required
- **Color Selection**: I will implement a **Preset Color Palette** (Cyan, Green, Pink, Purple, Blue, Orange) rather than a full color picker. This ensures the neon "glow" aesthetic of the game is preserved, as the rendering logic relies on HSL manipulation for shadows and highlights.
- **Special Notes**: Golden notes (*) and Freestyle notes (F) will retain their specific gameplay colors (Gold/Magenta) to distinguish them from normal notes.

## Proposed Changes

### [MODIFY] [MelodiqSettings.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/MelodiqSettings.tsx)
- Add State: `p1Name`, `p1Hue`, `p2Name`, `p2Hue`.
- Add UI Sections for P1 and P2:
    - **Name**: TextField (Default: "Player 1").
    - **Color**: Row of clickable colored circles (Presets).
- Persist to `localStorage`:
    - `melodiq_p1_name`, `melodiq_p1_hue`
    - `melodiq_p2_name`, `melodiq_p2_hue`

### [MODIFY] [MelodiqSession.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/MelodiqSession.tsx)
- Read new values from `localStorage` on mount.
- Pass `label={p1Name}` and `hue={p1Hue}` to `PitchVisualizer`.

### [MODIFY] [PitchVisualizer.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/PitchVisualizer.tsx)
- Add `hue?: number` to props.
- Use `hue` prop (defaulting to 190) for normal notes.
- Ensure Special Notes (Gold/Freestyle) override this hue.

## Verification Plan
### Manual Verification
1.  **Settings**:
    - Open Settings.
    - Change P1 Name to "Alice", Color to Pink.
    - Change P2 Name to "Bob", Color to Green.
    - Save.
2.  **Gameplay**:
    - Start a song.
    - Verify Top Visualizer has label "Alice" and Pink notes.
    - Verify Bottom Visualizer has label "Bob" and Green notes.
    - Verify Score Board (Header) uses names? (Optional: Update header to show names instead of P1/P2 Score). *Self-correction: I should update the header score labels too.*
    - Verify Gold notes still look Gold.
