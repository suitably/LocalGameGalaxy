---
title: "[HIGH] Memory Leak via Uncleared Timeout Timers in Intercepted Client API Requests"
severity: high
type: performance-risk
domain: Client-Server API Bridge
lens: state-architecture
labels:
  - "audit:architecture/state-architecture"
---

## Summary
In client mode, the custom fetch function `melodiqFetch` in [melodiqFetch.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/api/melodiqFetch.ts#L61-L97) intercepts API requests, registers an event listener on the `window` object, and dispatches them over a WebRTC data channel. A `setTimeout` of 45 seconds is registered to reject the fetch promise with a timeout error if a response is not received. 

However, when a response is successfully received, the promise resolves and the event listener is cleaned up, but the timeout timer is never cleared.

## Impact
The uncleared `setTimeout` timer closure holds references to `handleResponse`, `resolve`, `reject`, and the chunked response payload structures. Because these references remain active in the Javascript event loop for the full 45 seconds, it causes a significant memory leak and heap buildup under heavy song metadata loading operations.

## Evidence
In [melodiqFetch.ts:89-92](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/api/melodiqFetch.ts#L89-L92), a timeout is registered without storing or clearing the returned identifier:
```typescript
            // Timeout after 45 seconds (chunked large responses need more time)
            setTimeout(() => {
                window.removeEventListener(`melodiq_api_response_${reqId}`, handleResponse);
                reject(new Error('API Request Timeout'));
            }, 45000);
```

## Recommended Fix
Save the timeout identifier and clear the timer inside `handleResponse` (both when resolving and rejecting):

```typescript
        return new Promise((resolve, reject) => {
            const reqId = crypto.randomUUID();
            
            const timer = setTimeout(() => {
                window.removeEventListener(`melodiq_api_response_${reqId}`, handleResponse);
                reject(new Error('API Request Timeout'));
            }, 45000);
            
            const handleResponse = (e: Event) => {
                const customEvent = e as CustomEvent;
                clearTimeout(timer);
                window.removeEventListener(`melodiq_api_response_${reqId}`, handleResponse);
                
                if (customEvent.detail.status >= 200 && customEvent.detail.status < 300) {
                    resolve(customEvent.detail.data);
                } else {
                    reject(new Error(customEvent.detail.error || 'API Request Failed'));
                }
            };
            
            window.addEventListener(`melodiq_api_response_${reqId}`, handleResponse);
            ...
```

## References
- MDN: [clearTimeout()](https://developer.mozilla.org/en-US/docs/Web/API/clearTimeout)
- Chrome DevTools: [Memory Leaks Finder](https://developer.chrome.com/docs/devtools/memory-problems/)

## Validation
- attacker_source — n/a
- missing_guard — n/a
- sink_effect — n/a
- preconditions — none
- proof_anchors — src/games/melodiq/api/melodiqFetch.ts:89-92
- suggested_validation: grep -A 5 "Timeout after 45 seconds" src/games/melodiq/api/melodiqFetch.ts
