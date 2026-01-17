# Multiplayer Implementation Plan

## Goal Description
Enable local, simultaneous, competitive multiplayer for Melodiq.
- **Local Only**: Two players on the same device.
- **Simultaneous**: Both sing at the same time using different microphones.
- **Competitive**: Split-screen UI with separate scoring for each player.

## User Review Required
- **UI Layout**: The screen will be split horizontally? Or standard "singstar" style with top/bottom staves? I will assume **Top/Bottom** split for pitch visualization, sharing the background video/lyrics if possible, or duplicating the lyrics if they need to be player-specific (usually lyrics are shared).
- **Microphone Selection**: A new "Lobby" or "Setup" dialog will be needed before the session starts to assign microphones to Player 1 and Player 2.

## Proposed Changes

### Audio System
#### [MODIFY] [MicrophoneManager.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/audio/MicrophoneManager.ts)
- Add `deviceId` optional parameter to `start()`.
- Implement `static getDevices()` to list available audio inputs.
- Ensure `AudioContext` can handle multiple inputs (create separate instances or separate sources/analysers in one context). Separate instances might be safer for isolation.

### UI / Components
#### [NEW] [MicSetupDialog.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/MicSetupDialog.tsx)
- Dialog to enumerate devices.
- key: `deviceId`.
- Selectors for "Player 1 Mic" and "Player 2 Mic".

#### [MODIFY] [MelodiqSession.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/MelodiqSession.tsx)
- Accept `playerMicIds: string[]` prop (or similar configuration).
- Refactor state:
    - `score` -> `scores: number[]`
    - `currentPitch` -> `pitches: PitchResult[]` (or separate refs)
    - `micRef` -> `micRefs: MicrophoneManager[]`
- Render:
    - Split the `PitchVisualizer` area.
    - If 1 player: preserve existing view.
    - If 2 players: Render two `PitchVisualizer` components (stacked).
    - `LyricsDisplay` can remain centered (shared).

#### [MODIFY] [PitchVisualizer.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/PitchVisualizer.tsx)
- Ensure it can accept a specific `playerIndex` or just generic refs, so it doesn't need much change, just instantiation with different refs.

## Verification Plan

### Manual Verification
1.  **Device Enumeration**: Open the new setup dialog and verify it lists available microphones.
2.  **Single Player Regression**: Start a song with 1 player. Verify it still works as before.
3.  **Two Player Setup**:
    - Connect two distinct microphones (if available) or use virtual audio devices.
    - Start a song with 2 players.
    - Verify strict separation: Singing into Mic A moves Cursor A only. Singing into Mic B moves Cursor B only.
    - Verify scoring: Scores should update independently.
4.  **UI Check**: Ensure split screen looks correct and lyrics are visible to both.
