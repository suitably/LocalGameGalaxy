---
title: "[LOW] Client API Response Chunk Buffer Memory Leak in PhoneClientEngine"
severity: low
type: reliability-bug
domain: Client Engine
lens: architecture/api-contract
labels:
  - "audit:architecture/api-contract"
  - "bug"
---

## Summary
The Client application (`PhoneClientEngine.tsx`) implements WebRTC chunked reassembly for API responses. Large API responses (such as the list of songs) are split into chunks of 16,000 characters by the Host and sent as `api_response_chunk` messages. The Client stores these chunks in a React ref `chunkBufferRef` (which is a Map of `reqId` to `{ chunks: string[], total: number }`). If a chunk is lost, if the connection drops, or if the request times out (e.g. `melodiqFetch` rejects the promise after its 45-second timeout), the corresponding entries are never cleaned up from the Map, causing a memory leak.

## Impact
This leads to slow memory leaks on mobile clients during long-running sessions, which could eventually cause browser tab crashes or performance degradation on lower-end smartphone devices.

## Evidence
In [PhoneClientEngine.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/PhoneClientEngine.tsx#L112), the ref Map is initialized:
```typescript
    // Buffer to reassemble chunked api_response messages
    const chunkBufferRef = useRef<Map<string, { chunks: string[], total: number }>>(new Map());
```

In [PhoneClientEngine.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/PhoneClientEngine.tsx#L181-L205), chunks are appended, and the map entry is only deleted if *all* chunks have successfully arrived:
```typescript
        } else if (data.type === 'api_response_chunk') {
            // Reassemble chunked API response
            const { reqId, chunk, index, total } = data;
            if (!chunkBufferRef.current.has(reqId)) {
                chunkBufferRef.current.set(reqId, { chunks: new Array(total), total });
            }
            const buf = chunkBufferRef.current.get(reqId)!;
            buf.chunks[index] = chunk;

            // Check if all chunks arrived
            const receivedCount = buf.chunks.filter(c => c !== undefined).length;
            if (receivedCount === total) {
                chunkBufferRef.current.delete(reqId);
                try {
                    const fullJson = buf.chunks.join('');
                    const parsed = JSON.parse(fullJson);
                    window.dispatchEvent(new CustomEvent(`melodiq_api_response_${reqId}`, { detail: parsed }));
...
```
No cleanup or eviction strategy exists for incomplete, lost, or timed-out chunk streams.

## Recommended Fix
Implement a cleanup routine or max age check. For example, store a timestamp on each chunk stream buffer, and clean up entries older than 60 seconds using a periodic interval.

1. Update the stored value inside `chunkBufferRef` to include a timestamp:
```typescript
            if (!chunkBufferRef.current.has(reqId)) {
                chunkBufferRef.current.set(reqId, { chunks: new Array(total), total, timestamp: Date.now() });
            }
```

2. Add a `useEffect` cleanup timer in `PhoneClientEngine.tsx`:
```typescript
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            chunkBufferRef.current.forEach((val, key) => {
                // Remove if older than 60 seconds
                if (now - (val as any).timestamp > 60000) {
                    chunkBufferRef.current.delete(key);
                }
            });
        }, 10000); // Check every 10 seconds
        return () => clearInterval(interval);
    }, []);
```

## References
- Memory Management in Single Page Web Applications
- Garbage Collection and Leak Detection in V8/Javascript Engines

## Validation
- attacker_source — n/a
- missing_guard — missing eviction/cleanup mechanism for timed-out or aborted chunk reassembly buffers in `PhoneClientEngine`
- sink_effect — accumulation of orphaned API response chunks inside the `chunkBufferRef` Map, leading to memory leaks
- preconditions — API request must be initiated from a client, host must start chunk transmission, and the transmission must fail to complete (due to packet loss, disconnect, or client-side timeout)
- proof_anchors — src/games/melodiq/PhoneClientEngine.tsx:112, src/games/melodiq/PhoneClientEngine.tsx:181-205
- suggested_validation — grep -n "chunkBufferRef" src/games/melodiq/PhoneClientEngine.tsx
---
