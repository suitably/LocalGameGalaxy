---
title: "[Feature][Tabletop] Integrate Universal Party Lobby Launcher for Tabletop Games"
labels: ["party", "lobby", "tabletop", "launcher", "feature", "priority:high"]
assignees: []
---

## Summary
Integrate the declarative tabletop games into LocalGameGalaxy's central **Universal Party Lobby** (`src/features/party/`). The host can select any built-in or custom imported tabletop game that supports `party_multi_device` directly from the lobby. When launched, all connected smartphones automatically transition into the game (assigning each player to a free seat), the host screen transitions into the shared TV/Board view, and a single click on *„Zurück zur Party-Lobby“* brings all devices back to the lobby together.

## Architectural Context & Guidelines
- **Universal Party Infrastructure (Section 3 in docs/tech/architecture.md)**:
  - Extend `universalPartyManager.ts` without breaking existing games (Gartic Phone and GuessArt).
  - Use `PartyRoomState` to broadcast active game and `tabletopGameId`.
- **Anti-God-Component Architecture (Section 3.1 in AGENTS.md)**:
  - `PartyLobby.tsx` is currently tracking near budget limit (~620 lines). Any modification must extract subcomponents (e.g. `PartyGamePickerModal.tsx` or `TabletopGameGrid.tsx`) to maintain or decrease line count!
- **Auto-Seat Assignment**:
  - Connected party players (`roomState.players`) are deterministically mapped to player seats (`seat: 0`, `seat: 1`, ...) based on join order.
  - The host device is assigned `role: 'tv'` (shared table) unless configured otherwise.

## Dependencies & Preconditions
- **Depends on:** `ISSUE-TT-02` (Storage), `ISSUE-TT-05` (Sync Protocol)

## File Paths to Modify / Create
- `src/features/party/logic/universalPartyManager.ts`: Add `'tabletop'` to `PartyGameType`, add `tabletopGameId`, and implement `launchTabletopGame`.
- `src/features/party/components/PartyGamePickerModal.tsx`: Subcomponent displaying organized tabs (Party Games, Board & Cards, Imported Games).
- `src/features/party/components/TabletopGameGrid.tsx`: Grid showing installed tabletop games supporting `party_multi_device`.
- `src/features/party/PartyLobby.tsx`: Hook into `PartyGamePickerModal`.
- `src/games/tabletop/hooks/usePartyLobbyReturn.ts`: Hook for seamless 1-click return to `#/party?room=XYZ`.

## Step-by-Step Implementation Instructions

1. **Extend `universalPartyManager.ts`**:
   ```typescript
   export type PartyGameType = 'guessart' | 'garticphone' | 'tabletop';

   export interface PartyRoomState {
     // ...
     activeGame: PartyGameType | null;
     tabletopGameId?: string | null;
     // ...
   }

   public launchTabletopGame(roomId: string, tabletopGameId: string): void {
     // Set activeGame: 'tabletop', tabletopGameId: tabletopGameId
     // Broadcast updated roomState to all connected peers
   }
   ```

2. **Extract Game Picker (`PartyGamePickerModal.tsx`)**:
   - Tabbed layout:
     - 🎨 **Party-Klassiker**: *Gartic Phone*, *GuessArt*.
     - 🃏 **Karten & Brettspiele**: Built-in games (*Standard-Kartendeck*, *Liar's Dice*, *Dame/Schach*).
     - 📂 **Eigene Spiele**: Custom imported `.pcio` games from IndexedDB where `supportedModes.includes('party_multi_device')`.
   - Include quick *„Neues Spiel importieren“* button opening `GameDropZone`.

3. **Auto-Navigation on Game Start**:
   - In `PartyLobby.tsx`:
     ```typescript
     if (roomState.status === 'in_game' && roomState.activeGame === 'tabletop') {
       const isHost = universalPartyManager.isHost(roomId);
       const myPlayerIndex = roomState.players.findIndex(p => p.id === myPlayerId);
       const targetRoute = isHost
         ? `/games/tabletop?room=${roomId}&gameId=${roomState.tabletopGameId}&role=tv`
         : `/games/tabletop?room=${roomId}&gameId=${roomState.tabletopGameId}&seat=${myPlayerIndex}`;
       navigate(targetRoute);
     }
     ```

4. **Return to Party Lobby Integration**:
   - In `TabletopGame.tsx`, hook into `LayoutContext` / `GlobalHeader`:
     - If playing inside a party room, add top bar button: **`[🔙 Zurück zur Party-Lobby]`**.
     - On click by host: Dispatches `universalPartyManager.returnToLobby(roomId)`.
     - All devices seamlessly navigate back to `#/party?room=XYZ`.

## Verification & Quality Gates
```bash
npm run check:architecture:diff
npm run check:budget
npm run lint
npm test
npm run build
```
