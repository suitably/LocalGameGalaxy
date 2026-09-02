# Implementation Plan: Card Games UX Modernization & Streamlining

## 1. Goal Description
The user requested three key improvements for the Card Games (Kartenspiele) companion:
1. **Remove Custom Game Creation**: The "+ Eigenes Kartenspiel erstellen" builder is unnecessary because the built-in modes are already generalized.
2. **Streamline Schwimmen (31) Life Management**: Instead of entering raw points (0-31) for each player and calculating scores, players just need direct actions to mark who lost a life or trigger "⚡ Blitz!" (which makes all other players lose a life).
3. **Modernize Universal Score Tracker ("Punkte +/-")**: Replace the dated native number input with a sleek, modern, touch-friendly interactive score adjuster with quick increment/decrement buttons (`+1`, `+5`, `+10`, `+50`, `-1`, `-5`, `-10`, etc.), live delta preview, and polished tactile controls.

## 2. Component Hierarchy & SOLID Architecture
- `src/games/cards/`
  - `CardsGame.tsx`: Main container routing to Lobby, Schwimmen, Oh Hell, or Universal Score.
  - `components/`
    - `CardsLobby.tsx`: Simplified lobby with 3 built-in game cards, removing the custom game builder dialog.
    - `SchwimmenGameView.tsx`: Redesigned game view with direct player life cards, "Verliert Leben" selector, "⚡ Blitz!" instant triggers, and round history with undo.
    - `UniversalScoreView.tsx`: Modern score manager coordinating player scores and round history.
    - `ModernScoreAdjuster.tsx`: Dedicated, reusable, tactile score input component with quick delta chips, stepper, and clear button.
  - `logic/`
    - `schwimmenEngine.ts`: Simplified and enhanced logic for direct loser resolution and Blitz triggering.
    - `cardsEngine.test.ts`: Updated unit test suite covering direct loser life deductions, Blitz round sweeps, swimming status, and eliminations.
  - `i18n/`
    - `index.ts`: Full bilingual translations (German & English) for all new actions, labels, tooltips, and dialogs.

## 3. Proposed Changes
- **Lobby**: Remove `CustomGameBuilderDialog` usage from `CardsLobby.tsx`.
- **Schwimmen Logic**: Update `schwimmenEngine.ts` to support direct round resolution (`losers: string[]`, `isBlitz: boolean`, `blitzWinnerId?: string`).
- **Schwimmen UI**: Modernize `SchwimmenGameView.tsx` with one-tap Blitz, multi-loser selection, undo capabilities, and clean heart/ring icons.
- **Universal Score Tracker**: Create `ModernScoreAdjuster.tsx` with quick adjustment chips (+1, +5, +10, +50, -1, -5, -10, -50), clear button, custom styled inputs, and live target score preview.
- **i18n**: Add all required keys in `src/games/cards/i18n/index.ts` for `de` and `en`.
- **Testing**: Update and expand `src/games/cards/logic/cardsEngine.test.ts`.

## 4. Verification Plan
- Run `npm run test` to verify unit tests for `schwimmenEngine` and `cardsEngine`.
- Run `npm run build` (`tsc -b && vite build`) to confirm strict TypeScript and bundling pass without any warnings or errors.
- Create verification walkthrough in `docs/verification/cards-improvements-walkthrough.md`.
