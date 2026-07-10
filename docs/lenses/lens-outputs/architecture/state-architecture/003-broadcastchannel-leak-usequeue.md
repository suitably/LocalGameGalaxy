---
title: "[MEDIUM] Memory and Listener Leak via Uncleared BroadcastChannel in useQueue Hook"
severity: medium
type: performance-risk
domain: Cross-Tab Queue Synchronization
lens: state-architecture
labels:
  - "audit:architecture/state-architecture"
---

## Summary
The custom `useQueue` React hook in [useQueue.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/hooks/useQueue.ts#L34) instantiates a native browser `BroadcastChannel` using `useState` to sync queue updates across different tabs. 

However, `BroadcastChannel` is a persistent external browser resource that keeps network and message port structures alive. Because `useQueue` does not close this channel when it unmounts, the underlying channel remains open in the browser background.

## Impact
Every time the user navigates away from the Melodiq game back to the Main Hub (or other pages where the Melodiq game content unmounts), the existing hook is unmounted and the reference is lost, but the BroadcastChannel remains open, leading to memory and listener leaks. Over multiple navigation actions, this accumulates open channel handles and event listeners.

## Evidence
In [useQueue.ts:34](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/hooks/useQueue.ts#L34), the BroadcastChannel is initialized on state:
```typescript
    // Broadcast channel for cross-tab sync
    const [channel] = useState(() => new BroadcastChannel(CHANNEL_NAME));
```
There is no cleanup logic in `useQueue.ts` to call `channel.close()`.

## Recommended Fix
Clean up the `BroadcastChannel` handle by creating and managing it within a `useEffect` lifecycle hook that calls `channel.close()` on unmount:

```typescript
    const channelRef = useRef<BroadcastChannel | null>(null);

    useEffect(() => {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channelRef.current = channel;

        const handleMessage = (event: MessageEvent) => {
            if (isClient) return;
            if (event.data.type === 'UPDATE_QUEUE') {
                setQueue(event.data.payload);
            } else if (event.data.type === 'UPDATE_NOW_PLAYING') {
                setNowPlayingState(event.data.payload);
            }
        };

        channel.addEventListener('message', handleMessage);

        return () => {
            channel.removeEventListener('message', handleMessage);
            channel.close();
            channelRef.current = null;
        };
    }, []);
```

## References
- MDN Web Docs: [BroadcastChannel: close() method](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel/close)

## Validation
- attacker_source — n/a
- missing_guard — n/a
- sink_effect — n/a
- preconditions — none
- proof_anchors — src/games/melodiq/hooks/useQueue.ts:34
- suggested_validation: grep -n "new BroadcastChannel" src/games/melodiq/hooks/useQueue.ts
