---
title: "[Refactor][Sync] Create useMultiChannelSync<T> hook in src/modules/sync/ to unify BroadcastChannel and MQTT"
labels: ["refactoring", "sync", "dry", "solid", "priority:high"]
assignees: []
---

## Summary
The dual synchronization pattern – using a local `BroadcastChannel` for same-device tab communication alongside a remote `MqttMailboxService` – is copy-pasted across three games: GarticPhone, Storyteller, and GuessArt.
This creates duplicate lifecycle code, resource leak risks (unclosed BroadcastChannels), and inconsistency across games.

## Problem Details & Exact Code Locations
1. **GarticPhone duplication:**
   [`src/games/garticphone/GarticPhoneGame.tsx:113-125, 146-178, 245-260, 286-300`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/games/garticphone/GarticPhoneGame.tsx#L113)
2. **Storyteller duplication:**
   [`src/games/storyteller/StorytellerGame.tsx:164-183, 186-240, 350-360`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/games/storyteller/StorytellerGame.tsx#L164)
3. **Common Pattern:**
   ```typescript
   // Repeated in every game:
   const channel = new BroadcastChannel(`${prefix}_${channelId}`);
   channel.postMessage({ type: 'SYNC', payload });
   channel.close();
   mailbox.publish(channelId, { type: 'SYNC', payload });
   ```

## Dependencies & Preconditions
- **Depends on:** `ISSUE-SOLID-02` (GuessArt mailbox migration to shared sync module)
- **Blocks:** `ISSUE-SOLID-05` (GarticPhone God Component decomposition)

## Step-by-Step Implementation Instructions
1. Create `src/modules/sync/useMultiChannelSync.ts`:
   ```typescript
   import { useEffect, useCallback, useRef } from 'react';
   import type { MqttMailboxService } from './MqttMailboxService';

   export interface UseMultiChannelSyncOptions<T> {
     channelId: string | null | undefined;
     broadcastPrefix: string;
     mailbox: MqttMailboxService<T>;
     onMessage: (payload: T, source: 'broadcast' | 'mqtt') => Promise<void> | void;
     enabled?: boolean;
   }

   export interface UseMultiChannelSyncReturn<T> {
     publish: (payload: T) => void;
   }

   export function useMultiChannelSync<T>({
     channelId,
     broadcastPrefix,
     mailbox,
     onMessage,
     enabled = true,
   }: UseMultiChannelSyncOptions<T>): UseMultiChannelSyncReturn<T> {
     const onMessageRef = useRef(onMessage);
     onMessageRef.current = onMessage;

     useEffect(() => {
       if (!channelId || !enabled) return;

       let bc: BroadcastChannel | null = null;
       try {
         bc = new BroadcastChannel(`${broadcastPrefix}_${channelId}`);
         bc.onmessage = (event) => {
           if (event.data) {
             onMessageRef.current(event.data as T, 'broadcast');
           }
         };
       } catch (err) {
         console.warn(`[useMultiChannelSync] BroadcastChannel unsupported:`, err);
       }

       const unsubscribeMqtt = mailbox.subscribe(channelId, (payload) => {
         onMessageRef.current(payload, 'mqtt');
       });

       return () => {
         if (bc) {
           bc.close();
         }
         unsubscribeMqtt();
       };
     }, [channelId, broadcastPrefix, mailbox, enabled]);

     const publish = useCallback(
       (payload: T) => {
         if (!channelId) return;

         try {
           const bc = new BroadcastChannel(`${broadcastPrefix}_${channelId}`);
           bc.postMessage(payload);
           bc.close();
         } catch {
           // Ignore BroadcastChannel errors in unsupported envs
         }

         try {
           mailbox.publish(channelId, payload);
         } catch (err) {
           console.warn(`[useMultiChannelSync] MQTT publish failed:`, err);
         }
       },
       [channelId, broadcastPrefix, mailbox]
     );

     return { publish };
   }
   ```
2. Export `useMultiChannelSync` and types in `src/modules/sync/index.ts`.
3. Refactor `src/games/storyteller/StorytellerGame.tsx` to use `useMultiChannelSync`.
4. Refactor `src/games/garticphone/GarticPhoneGame.tsx` to use `useMultiChannelSync`.
5. Add unit tests in `src/modules/sync/useMultiChannelSync.test.ts` mocking `BroadcastChannel` and `MqttMailboxService`.

## Affected Files
- `src/modules/sync/useMultiChannelSync.ts` (new)
- `src/modules/sync/useMultiChannelSync.test.ts` (new)
- `src/modules/sync/index.ts`
- `src/games/storyteller/StorytellerGame.tsx`
- `src/games/garticphone/GarticPhoneGame.tsx`

## Acceptance Criteria & Verification
- [ ] `useMultiChannelSync` cleanly manages cleanup of both BroadcastChannel and MQTT listener on unmount/channel change.
- [ ] Storyteller and GarticPhone use `useMultiChannelSync` without inline BroadcastChannel duplication.
- [ ] `npm run lint` completes with zero errors.
- [ ] `npm run build` completes with zero errors.
