# Plan: Unified Settings Layout [ID: UNIFIED-SETTINGS-PLAN]

## 1. Goal Description
Unify the general settings page and game-specific settings (currently Melodiq) into a single, cohesive `/settings` layout.
The layout will feature:
1. A sidebar or tab navigation on the left/top.
2. A **General** category (always visible) containing UI language preferences and the Feedback & Bug Report form.
3. Game-specific categories (starting with **Melodiq**) that expose their settings.
4. Support for opening settings directly from within a game (preserving the game's context/connection state by rendering the same component inline, pre-selecting the game's tab, and providing a Back button to return to the game).
5. Prevention of code duplication (removing duplicate feedback forms and language selectors from Melodiq settings).

## 2. Component Hierarchy & Design
We will structure the settings view to satisfy the SOLID Single Responsibility Principle:

```
Settings (Main Layout / Routing view)
├── Sidebar / Tab Navigation (General, Melodiq)
├── GeneralSettings (Language Preferences, Feedback Form)
└── MelodiqSettingsCategory (Helper, Mic, Profiles, Game Settings Panel, Session Actions)
```

## 3. Proposed Changes

### A. Core Architecture & Context
- **Global Settings Context**: Move/Wrap `<SettingsProvider>` from Melodiq to the root of the app in `src/main.tsx`. This allows the global `/settings` route to access Melodiq settings seamlessly.

### B. Features & Components
1. **`src/features/settings/components/GeneralSettings.tsx`** (New File):
   - Extract the language selector and feedback submission form from the original `Settings.tsx` into a clean, standalone component.
2. **`src/features/settings/components/MelodiqSettingsCategory.tsx`** (New File):
   - Extract the Melodiq-specific settings (Microphone setups, User Profiles, Helper Connection, Game Settings, Undo/Reset footer buttons) from `MelodiqSettings.tsx`.
3. **`src/features/settings/Settings.tsx`** (Modified File):
   - Redesign to display a sidebar/tab navigation with "General" and "Melodiq".
   - Accept props: `activeGameId?: string` and `onBack?: () => void`.
   - Read URL search parameters (e.g., `?game=melodiq`) to auto-select the initial tab.
   - If `onBack` is not provided, render a standard Back button navigating to the game (e.g., `/games/melodiq` if `game=melodiq` is in the URL) or back to the Hub (`/`).

### C. Game Refactoring
1. **`src/games/melodiq/MelodiqGame.tsx`** (Modified File):
   - When the host clicks the settings button, instead of mounting the old `MelodiqSettings.tsx` internally, it will render the unified `<Settings activeGameId="melodiq" onBack={...} />` component. This preserves the host session (WebRTC, queue, songs) without navigating away from the page, while using the exact same unified UI.
2. **`src/games/melodiq/MelodiqSettings.tsx`** (Deleted/Replaced File):
   - This file is now redundant and will be removed or replaced by a lightweight wrapper if needed.

### D. Global Navigation
1. **`src/components/Layout/GlobalHeader.tsx`** (Modified File):
   - Ensure the settings icon is visible where appropriate, navigating to `/settings`. If a game is active but does not run in a custom iframe/standalone view, we can navigate to `/settings?game=[id]`.

## 4. Verification Plan
- **Linting & Compilation**: Run `npm run lint` and `npm run build` to verify there are no compilation or layout errors.
- **Visual Checks**:
  - Verify layout looks premium on desktop and mobile.
  - Verify tab switching works between General and Melodiq.
  - Verify the language selector changes the application language instantly.
  - Verify the feedback form is functional.
  - Verify Melodiq-specific settings (profiles, mics, volume sliders) load and save to `localStorage` correctly.
- **Session Verification**:
  - Start a Melodiq game as Host.
  - Open Settings, check that WebRTC connections/queue are not lost.
  - Close Settings, confirm the game continues seamlessly.
