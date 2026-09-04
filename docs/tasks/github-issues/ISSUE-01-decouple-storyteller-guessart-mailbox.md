---
title: "[Critical][Architecture] Decouple Storyteller from GuessArt Mailbox & Fix Broken MQTT Sync"
labels: ["bug", "architecture", "critical", "storyteller", "guessart"]
assignees: []
---

## Summary
`StorytellerGame.tsx` currently imports `mailboxService` directly from `src/games/guessart/logic/mailboxService.ts`. This breaks the Dependency Inversion Principle (DIP) and causes a silent runtime failure in cross-device MQTT synchronization.

## Problem Details & Root Cause
1. In [`StorytellerGame.tsx:L21, L25`](file:///home/deck/Projects/LocalGameGalaxy/src/games/storyteller/StorytellerGame.tsx#L21):
   ```ts
   import { mailboxService } from '../guessart/logic/mailboxService';
   import type { GameSnapshot } from '../guessart/logic/types';
   ```
2. When Storyteller publishes an MQTT turn via `mailboxService.publishTurn(topic, { type: 'STORY_SYNC', snapshot })`, the receiving device triggers `handleIncomingRemoteSnapshot()` in GuessArt's mailbox.
3. GuessArt's mailbox directly calls `LocalGameEngine.importSnapshot(snapshot, language)`.
4. GuessArt's `LocalGameEngine` expects `snapshot.game` (GuessArt format). Since Storyteller passes a story snapshot, `LocalGameEngine` throws an `Invalid game snapshot` error.
5. The exception causes execution to abort before reaching the subscriber callback loop (`this.listeners.forEach(...)`).
6. Consequently, Storyteller clients never receive real-time turns over MQTT across different devices.

## Proposed Solution (SOLID: Dependency Inversion & Single Responsibility)
1. Extract a generic MQTT mailbox service to `src/modules/sync/MqttMailboxService.ts` (or `src/lib/sync/MqttMailboxService.ts`).
2. Make `MqttMailboxService<T>` generic over payload type `T`.
3. Remove game-specific engine imports (`LocalGameEngine.importSnapshot`) from the generic message dispatcher. Instead, the subscriber callback registered by the game handles parsing and importing.
4. Update both `guessart` and `storyteller` to instantiate or inject their own typed mailbox channels.

## Affected Files
- `src/games/storyteller/StorytellerGame.tsx`
- `src/games/guessart/logic/mailboxService.ts`
- New: `src/modules/sync/MqttMailboxService.ts` (or `src/lib/sync/`)

## Acceptance Criteria
- [ ] No cross-game imports between `src/games/storyteller/` and `src/games/guessart/`.
- [ ] Storyteller MQTT turns successfully synchronize across separate browser sessions.
- [ ] Unit tests cover `MqttMailboxService` dispatching without depending on `LocalGameEngine`.
