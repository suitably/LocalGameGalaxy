---
title: "[Architecture][Cross-Game] Eliminate cross-game mailboxService import in GarticPhone"
labels: ["architecture", "refactoring", "sync", "garticphone", "guessart", "priority:high"]
assignees: []
---

## Summary
`src/games/garticphone/GarticPhoneGame.tsx` imports `mailboxService` directly from `src/games/guessart/logic/mailboxService.ts`.
This directly violates `AGENTS.md` (Section 4.3 and Section 6), creating tight coupling between two independent games and causing GarticPhone to fail when GuessArt's mailbox is modified or removed.

## Problem Details & Exact Code Locations
1. **Forbidden import:**
   [`src/games/garticphone/GarticPhoneGame.tsx:17`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/games/garticphone/GarticPhoneGame.tsx#L17):
   ```typescript
   import { mailboxService } from '../guessart/logic/mailboxService';
   ```
2. **Call sites in GarticPhoneGame.tsx:**
   - Lines 120-125: `mailboxService.publish(...)`
   - Lines 170-178: `mailboxService.subscribe(...)`
   - Lines 250-255: `mailboxService.publish(...)`

## Dependencies & Preconditions
- **Depends on:** `ISSUE-SOLID-02` (GuessArt mailboxService migration to shared sync module)
- **Blocks:** `ISSUE-SOLID-05` (GarticPhone God Component decomposition)

## Step-by-Step Implementation Instructions
1. Create a game-specific mailbox instance for GarticPhone at `src/games/garticphone/garticMailbox.ts`:
   ```typescript
   import { MqttMailboxService } from '../../modules/sync/MqttMailboxService';
   import type { GarticGameState } from './types';

   export interface GarticSyncMessage {
     type: 'GARTIC_SYNC' | 'GARTIC_END' | 'GARTIC_RESTART';
     state: GarticGameState;
   }

   export const garticMailbox = new MqttMailboxService<GarticSyncMessage>({
     topicPrefix: 'lgg/gartic',
   });
   ```
2. In `src/games/garticphone/GarticPhoneGame.tsx`:
   - Replace the import on line 17:
     ```typescript
     // Delete:
     import { mailboxService } from '../guessart/logic/mailboxService';
     // Replace with:
     import { garticMailbox } from './garticMailbox';
     ```
   - Replace all `mailboxService.` invocations with `garticMailbox.`.
3. Check for any other cross-game imports:
   ```bash
   grep -rn "from.*guessart" src/games/garticphone/
   ```

## Affected Files
- `src/games/garticphone/garticMailbox.ts` (new)
- `src/games/garticphone/GarticPhoneGame.tsx`

## Acceptance Criteria & Verification
- [ ] No file in `src/games/garticphone/` imports from `src/games/guessart/`.
- [ ] Verification command returns zero matches:
  ```bash
  grep -rn "from.*guessart" src/games/garticphone/
  ```
- [ ] `npm run lint` completes with zero errors.
- [ ] `npm run build` completes with zero errors.
- [ ] Multi-device GarticPhone sync continues to transmit round events.
