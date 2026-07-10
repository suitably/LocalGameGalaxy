---
title: "[HIGH] Unstable createManager Prop Reference Triggers Continuous WebRTC Manager Re-initialization"
severity: high
type: reliability-bug
domain: WebRTC Connection State
lens: state-architecture
labels:
  - "audit:architecture/state-architecture"
---

## Summary
The `WebRTCProvider` component in [WebRTCContext.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/audio/WebRTCContext.tsx#L13-L15) passes an inline function to the `createManager` prop of `WebRTCHostProvider`. In `WebRTCHostProvider` (defined in [WebRTCHostContext.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/lib/webrtc/WebRTCHostContext.tsx#L120-L192)), this prop is a dependency in a `useEffect` hook that handles the instantiation, start, and cleanup of the `WebRTCHostManager` instance. 

Because the function is defined inline, its reference identity changes on every render. Consequently, any render of the parent component triggers the cleanup function of the `useEffect` hook, which tears down the active manager (destroying all WebRTC peer connections) and schedules a new one.

## Impact
This leads to severe network instability, including dropped connection states, frequent WebRTC renegotiation/reconnection overhead, and visual flickers in the player rosters when context state updates.

## Evidence
In [WebRTCContext.tsx:13-15](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/audio/WebRTCContext.tsx#L13-L15), the callback is passed inline:
```typescript
        <WebRTCHostProvider<MicRemotePeer, WebRTCMicManager>
            gameId="melodiq"
            createManager={(partyId, trackerUrls, callbacks) => {
                return new WebRTCMicManager(partyId, trackerUrls, callbacks);
            }}
        >
```

In [WebRTCHostContext.tsx:120-192](file:///home/deck/Projects/LocalGameGalaxy/src/lib/webrtc/WebRTCHostContext.tsx#L120-L192), the lifecycle hook depends on `createManager`:
```typescript
    useEffect(() => {
        if (!partyId || activeTrackerUrls.length === 0) return;

        let managerInstance: M | null = null;
        let isCleanedUp = false;

        const timer = setTimeout(() => {
            if (isCleanedUp) return;
            managerInstance = createManager(partyId, activeTrackerUrls, { ... });
            ...
        }, 500);

        return () => {
            isCleanedUp = true;
            clearTimeout(timer);
            if (managerInstance) {
                console.log(`[WebRTCHostProvider:${gameId}] Cleaning up Manager`);
                managerInstance.stop();
                setManager(null);
                setPeers([]);
            }
        };
    }, [partyId, JSON.stringify(activeTrackerUrls), gameId, createManager]);
```

## Recommended Fix
Extract the `createManager` callback to a static, module-level function outside of the `WebRTCProvider` component to guarantee reference stability:

```typescript
const createMicManager = (partyId: string, trackerUrls: string[], callbacks: any) => {
    return new WebRTCMicManager(partyId, trackerUrls, callbacks);
};

export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <WebRTCHostProvider<MicRemotePeer, WebRTCMicManager>
            gameId="melodiq"
            createManager={createMicManager}
        >
            {children}
        </WebRTCHostProvider>
    );
};
```

## References
- React Docs: [useEffect Dependencies](https://react.dev/reference/react/useEffect#specifying-reactive-dependencies)
- MDN: [Function identity and closures in React](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures)

## Validation
- attacker_source — n/a
- missing_guard — n/a
- sink_effect — n/a
- preconditions — none
- proof_anchors — src/games/melodiq/audio/WebRTCContext.tsx:13-15
- suggested_validation: grep -n "createManager={" src/games/melodiq/audio/WebRTCContext.tsx
