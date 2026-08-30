# Implementation Plan: Comprehensive Resolution of All Open Issues

This document outlines the grouping, analysis, and implementation strategy for all open GitHub issues in **LocalGameGalaxy**.

---

## 1. Issue Overview & Grouping

### **Group 1: UI & Initial Launch UX (GuessArt & Imposter)**
- **Issue #107**: `[Feedback] GuessArt first Start how To play hidden` + `Selbes gilt für Imposter`
  - **Problem**: The "How to play" (GameInfoDialog) automatically pops up on the first app load, which is unwanted.
  - **Solution**: Default `infoOpen` state to `false` in both `GuessArtGame.tsx` and `ImposterGame.tsx`. Keep the info icon accessible in the header.
- **Issue #101**: `[Feedback] GuessArt word catalogue phone view`
  - **Problem**: In the catalogue editor (`CatalogueEditorDialog.tsx`), tab labels are too wide for mobile screens.
  - **Solution**: Make tabs scrollable with `variant="scrollable" scrollButtons="auto"`, and show compact icons/responsive labels on small viewports (`xs`).
- **Issue #102**: `[Feedback] GuessArt hinzufügen button phone`
  - **Problem**: The "Hinzufügen" button text overflows on narrow phone viewports.
  - **Solution**: Responsive button styling in `WordEditorTab.tsx` and `CategoryEditorTab.tsx` (icon-only on extra-small screens, full text on larger screens).
- **Issue #104**: `[Feedback] GuessArt Zeichenfenster optimierrn`
  - **Problem**: On phones, toolbar and headers take up too much vertical space, reducing the active drawing canvas.
  - **Solution**: Minimize padding around the canvas (`p: { xs: 0.5, sm: 1.5 }`), streamline the bottom submit button bar, and ensure Excalidraw gets maximum height.

---

### **Group 2: GuessArt Gameplay & Catalogue Enhancements**
- **Issue #103**: `[Feedback] Guessart add synonyms via history`
  - **Problem**: Players want to easily add an incorrectly guessed word as a synonym directly from the round history or victory modal.
  - **Solution**:
    1. Implement `addSynonymToWord(...)` in `catalogueManager.ts` to update the master catalogue in Dexie IDB.
    2. In `RoundSuccessModal.tsx` and `RoundHistoryDialog.tsx`, make wrong guess chips interactive with an "Add as synonym" button / chip action.
    3. Include language selector support (defaulting to current app language) and toast confirmation.

---

### **Group 3: Qwixx Score Sheet Layout & Game Modes**
- **Issue #108**: `[Feedback] Qwixx big points Bonus Reihe breite anpassen`
  - **Problem**: The Bonus row in Big Points stretched across the entire width without the lock column, misaligning the 11 numbers with the 12 columns of the main rows.
  - **Solution**: Ensure bonus rows align with standard rows by matching the 12-column grid layout and placing a lock-sized badge/spacer at the end of the bonus row.
- **Issue #109**: `[Feedback] Qwixx Chain`
  - **Problem**: Chains were only visible after clicking, and numbers weren't visually connected across rows.
  - **Solution**:
    1. Display prominent chain badges with distinct color identifiers (Chain 1..5) for each connected number before and after crossing.
    2. Maintain strict ascending/descending numerical order matching official Qwixx Connect / Connected rules.
    3. When one chain link is crossed, visually highlight and auto-cross the connected partner cell according to official rules.
- **Issue #110**: `[Feedback] Qwixx Longo`
  - **Problem**: Missing the official *Qwixx Longo* game mode.
  - **Solution**:
    1. Implement Qwixx Longo sheet definition (numbers 2..16 for Red/Yellow, 16..2 for Green/Blue).
    2. Add D8 (8-sided dice, values 1..8, sum up to 16) support in `QwixxDiceRoller.tsx`.
    3. Add 2 individual lucky numbers (Glückszahlen) on each player's sheet.
    4. Set lock condition to 6 crosses + lock number (16/2) for +1 bonus cross.
    5. Support scoring up to 16 crosses with full triangular points calculation ($n \times (n+1) / 2$).
    6. Integrate into sheet selector, reducer, dice highlighter, and i18n (DE/EN).

---

### **Group 4: GuessArt Multiplayer (Async & Gartic Phone Real-time)**
- **Issue #105**: `[Feedback] GuessArt Aysnc multiplayer`
  - **Problem**: Support account-free asynchronous multiplayer via UUIDs with shareable URLs, turn state notifications, and a games overview.
  - **Solution**:
    1. Extend GuessArt repository and engine for async UUID game sessions (`?gameId=<uuid>&mode=async`).
    2. Provide shareable invitation links and turn handoff.
    3. Implement browser notification triggers and active game cards in the lobby.
- **Issue #106**: `[Feedback] Neuer Gamemode gartic phone`
  - **Problem**: Real-time multiplayer Gartic Phone game mode connecting players via WebSockets / WebRTC using the Excalidraw drawing engine.
  - **Solution**:
    1. Create a dedicated Gartic Phone mode utilizing the existing WebRTC Host/Client peer-to-peer infrastructure.
    2. Cycle turns: Prompt (Text) ➔ Drawing (Excalidraw) ➔ Guessing (Text) ➔ Drawing ➔ Album presentation.
    3. Support multiple room sizes and game modes (Classic, Secret, Animation).

---

### **Group 5: Housekeeping**
- **Issue #96**: `[Feedback] s`
  - **Action**: Invalid / accidental test issue. Close with explanation.

---

## 2. Verification Plan
1. **Unit & Integration Tests**: Run existing test suites (`npm test`).
2. **ESLint & TypeScript Verification**: Run `npm run lint` and `npm run build` (`tsc -b && vite build`) to ensure zero warnings or errors.
3. **Manual Flow Testing**:
   - Verify initial launch of GuessArt and Imposter does not auto-open info dialog.
   - Verify catalogue dialog tabs and add buttons on mobile viewports.
   - Test adding synonyms from round history / round success modal.
   - Verify Qwixx Big Points column alignment, Qwixx Connected chain badges, and Qwixx Longo D8 rolling and scoring.
   - Test GuessArt async UUID game flow and Gartic Phone real-time game mode.
