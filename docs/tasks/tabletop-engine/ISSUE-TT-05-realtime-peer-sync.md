---
title: "[Feature][Tabletop] Real-Time Multi-Device Sync Protocol via useMultiChannelSync"
labels: ["tabletop", "sync", "mqtt", "protocol", "feature", "priority:high"]
assignees: []
---

## Summary
Implement the real-time peer-to-peer and multi-device synchronization protocol for tabletop games. The protocol connects TV/Host displays with player smartphone controllers over LocalGameGalaxy's shared sync infrastructure (`useMultiChannelSync` and `MqttMailboxService`), supporting action intents like **Flick to TV**, drawing cards, rolling dice, and full state snapshots for late-joining players.

## Architectural Context & Guidelines
- **Mandatory Shared Sync Infrastructure (Section 5 in AGENTS.md)**:
  - Use `useMultiChannelSync` from `src/modules/sync/useMultiChannelSync.ts`.
  - Use `MqttMailboxService` from `src/modules/sync/MqttMailboxService.ts`.
  - Zero tolerance for inline `new BroadcastChannel()` calls in game components.
- **Client-Serverless State Convergence**:
  - The TV/Host acts as the state arbiter.
  - When a phone triggers an action (e.g. `FLICK_CARD_TO_TABLE`), it broadcasts an intent.
  - The TV receives the intent, triggers the visual fly-in animation, updates authoritative state, and broadcasts delta confirmations.
  - New joining players request a full snapshot via `REQUEST_SNAPSHOT`.

## Dependencies & Preconditions
- **Depends on:** `ISSUE-TT-03` (Surface & Widgets), `ISSUE-TT-04` (Smartphone Controller)

## File Paths to Create
- `src/games/tabletop/logic/syncProtocol.ts`: Message types and action envelopes.
- `src/games/tabletop/hooks/useTabletopSync.ts`: Custom hook managing channel lifecycle, dispatch, and message reception.
- `src/games/tabletop/hooks/__tests__/syncProtocol.test.ts`: Vitest test suite for action reductions.

## Step-by-Step Implementation Instructions

1. **Define Protocol Types (`syncProtocol.ts`)**:
   ```typescript
   export type TabletopSyncAction =
     | { type: 'REQUEST_SNAPSHOT'; senderId: string }
     | { type: 'STATE_SNAPSHOT'; state: TabletopGameDefinition; senderId: string }
     | { type: 'FLICK_CARD_TO_TABLE'; cardId: string; targetHolderId: string; senderSeat: number; senderId: string }
     | { type: 'DRAW_CARD'; deckId: string; targetSeat: number; senderId: string }
     | { type: 'ROLL_DICE'; dieIds: string[]; senderId: string }
     | { type: 'MOVE_WIDGET'; id: string; x: number; y: number; zIndex?: number; senderId: string }
     | { type: 'UPDATE_COUNTER'; counterId: string; delta: number; senderId: string }
     | { type: 'RETURN_TO_LOBBY'; senderId: string };

   export interface TabletopSyncEnvelope {
     gameId: string;
     roomId: string;
     action: TabletopSyncAction;
     timestamp: number;
   }
   ```

2. **Implement Coordination Hook (`useTabletopSync.ts`)**:
   ```typescript
   export function useTabletopSync(options: {
     roomId: string;
     isHost: boolean;
     mySeat: number | null;
     onAction: (action: TabletopSyncAction) => void;
   }) {
     const { publish } = useMultiChannelSync<TabletopSyncEnvelope>({
       channelId: options.roomId,
       broadcastPrefix: 'galaxy_tabletop',
       mailbox,
       onMessage: (envelope) => {
         if (envelope.action.senderId === myPeerId) return; // Ignore own echo
         options.onAction(envelope.action);
       },
       enabled: Boolean(options.roomId),
     });

     const dispatchAction = useCallback((action: TabletopSyncAction) => {
       publish({
         gameId,
         roomId: options.roomId,
         action,
         timestamp: Date.now(),
       });
     }, [publish, options.roomId]);

     return { dispatchAction };
   }
   ```

3. **Handle TV Fly-In Integration**:
   - On the TV/Host: When receiving `FLICK_CARD_TO_TABLE`, dispatch `ANIMATE_CARD_TO_TABLE` into `tabletopReducer` to start the fly-in animation and update the target holder's `childIds`.
   - On the Phone: Optimistically remove card from local hand.

4. **Add Unit Tests**:
   - Test action serialization, snapshot synchronization, and echo filtering.

## Verification & Quality Gates
```bash
npm run check:architecture:diff
npm run check:budget
npm run lint
npm test -- src/games/tabletop
npm run build
```
