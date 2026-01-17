# Dynamic Multi-User & Profiles Implementation Plan

## Goal Description
1.  **User Profiles**: Persistent storage of users (Name, Color). These exist regardless of whether they are playing right now.
2.  **Dynamic Session**: Select which profiles are "Active" for the next game. Assign microphones only to active players.
3.  **Scalability**: Support N active players.

## Data Structures

### `UserProfile` (Persistent)
Stored in `melodiq_profiles` (localStorage).
```typescript
interface UserProfile {
    id: string; // UUID
    name: string;
    hue: number;
    avatar?: string; // Future proofing
}
```

### `ActivePlayer` (Session)
Stored in `melodiq_active_session` (localStorage) - or just derived from selection state + mic config.
```typescript
interface ActivePlayer {
    profileId: string;
    deviceId: string;
}
```

## Proposed Changes

### [MODIFY] [MelodiqSettings.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/MelodiqSettings.tsx)

#### 1. Profile Management Section (New)
- **"Manage Profiles"**:
    - List of all Profiles.
    - "Add New Profile" button.
    - Edit/Delete actions for each profile.

#### 2. Session Setup Section (Modified)
- **"Who is singing today?"**:
    - List of available profiles with checkboxes (Enable/Disable).
    - **Active List**:
        - For each enabled profile, show a row.
        - **Mic Selector**: Dropdown to pick the input device for this specific player.
        - **Drag & Drop** (Optional/Future): To reorder split screen position? (For now, just order of selection).

### [MODIFY] [MelodiqSession.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/MelodiqSession.tsx)
- Load `melodiq_profiles` and `melodiq_active_session`.
- Map `active_session` -> `profiles` to get Names/Colors.
- Initialize `MicrophoneManager` for each active player.
- Render dynamic list of `PitchVisualizer`.

## Migration Strategy
- On first load, if `melodiq_profiles` is empty but `melodiq_p1_name` exists:
    - Create "Player 1" profile using old name/color.
    - Create "Player 2" profile using old name/color.
    - Set them both as active.
- Clear old keys.

## Verification Plan
1.  **Profile CRUD**: Create "Guest", change color, delete "Guest".
2.  **Selection**: Select "Player 1" and "Guest". Assign Mics.
3.  **Persistence**: Reload page. content profiles and active selection should remain.
4.  **Gameplay**: Verify Session shows only the 2 selected players.
