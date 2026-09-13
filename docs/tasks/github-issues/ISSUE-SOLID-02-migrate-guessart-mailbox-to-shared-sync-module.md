---
title: "[Architecture][Sync] Migrate GuessArt mailboxService to shared MqttMailboxService<T>"
labels: ["architecture", "refactoring", "sync", "guessart", "dip", "priority:high"]
assignees: []
---

## Summary
`src/games/guessart/logic/mailboxService.ts` (280 lines) is a redundant reimplementation of `src/modules/sync/MqttMailboxService.ts` (231 lines). Both connect to identical MQTT brokers (`wss://broker.hivemq.com:8884/mqtt`, `wss://broker.emqx.io:8084/mqtt`), perform LZString compression, implement envelope structures, and handle reconnects.
In addition, `GuessArtMailboxService` directly imports `LocalGameEngine` and `guessArtNotificationService`, violating the Dependency Inversion Principle (DIP) and Single Responsibility Principle (SRP).

## Problem Details & Exact Code Locations
1. **Redundant MQTT Implementation:**
   [`src/games/guessart/logic/mailboxService.ts:1-280`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/games/guessart/logic/mailboxService.ts#L1)
2. **Generic Shared Implementation:**
   [`src/modules/sync/MqttMailboxService.ts:1-231`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/modules/sync/MqttMailboxService.ts#L1)
3. **Hard-coded Domain Dependencies inside Mailbox:**
   [`src/games/guessart/logic/mailboxService.ts:4-5`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/games/guessart/logic/mailboxService.ts#L4):
   ```typescript
   import { LocalGameEngine } from './engine';
   import { guessArtNotificationService } from './notificationService';
   ```

## Dependencies & Preconditions
- **Dependencies:** None.
- **Blocks:**
  - `ISSUE-SOLID-03` (Cross-game mailboxService elimination in GarticPhone)
  - `ISSUE-SOLID-04` (`useMultiChannelSync` hook creation)

## Step-by-Step Implementation Instructions
1. Inspect all callers of `mailboxService` within `src/games/guessart/`:
   ```bash
   grep -rn "mailboxService" src/games/guessart/
   ```
2. Create a typed instance using the shared service at `src/games/guessart/logic/guessArtMailbox.ts`:
   ```typescript
   import { MqttMailboxService } from '../../../modules/sync/MqttMailboxService';
   import type { GameSnapshot } from './types';

   export const guessArtMailbox = new MqttMailboxService<GameSnapshot>({
     topicPrefix: 'lgg/ga',
   });
   ```
3. Move notification triggering and engine snapshot importing out of the mailbox class into the listener registered in `src/games/guessart/hooks/useGuessArtGame.ts` (or component where subscription is created):
   - When `guessArtMailbox.subscribe(gameId, listener)` receives a message, the listener parses the snapshot, calls `LocalGameEngine.importSnapshot(snapshot)`, and calls `guessArtNotificationService.notifyTurnChange(...)`.
4. Update all GuessArt imports from `./mailboxService` to `./guessArtMailbox`.
5. Remove `src/games/guessart/logic/mailboxService.ts` once all callers are migrated.

## Affected Files
- `src/games/guessart/logic/mailboxService.ts` (deleted)
- `src/games/guessart/logic/guessArtMailbox.ts` (new)
- `src/games/guessart/hooks/useGuessArtGame.ts`
- `src/games/guessart/GuessArtGame.tsx`

## Acceptance Criteria & Verification
- [ ] `src/games/guessart/logic/mailboxService.ts` is completely removed.
- [ ] GuessArt uses `MqttMailboxService<GameSnapshot>` from `src/modules/sync`.
- [ ] No direct imports of `LocalGameEngine` exist within the network transport layer.
- [ ] `npm run lint` completes with zero errors.
- [ ] `npm run build` completes with zero errors.
- [ ] GuessArt turn synchronization across two browser tabs/windows succeeds.
