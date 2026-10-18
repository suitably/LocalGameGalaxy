## Context & Problem

`jscpd` flags duplicate channel health/heartbeat logic between WebRTC host and client implementations:

- `src/lib/webrtc/WebRTCHostManager.ts` [143–155] <-> `src/lib/webrtc/useWebRTCClient.ts` [380–392] (13 lines: identical RTCDataChannel ping-timeout, buffered amount threshold, and reconnection trigger).

Because this ping/pong heartbeat logic is critical for detecting dropped Wi-Fi connections on mobile devices, having two separate implementations creates subtle divergence bugs during transient network drops.

## Branch

`refactor/webrtc-heartbeat-dedup`

## Target Files

- `src/lib/webrtc/WebRTCHostManager.ts`
- `src/lib/webrtc/useWebRTCClient.ts`
- New utility: `src/lib/webrtc/dataChannelHeartbeat.ts`
- Unit tests: `src/lib/webrtc/dataChannelHeartbeat.test.ts`

## Implementation Steps

1. **Extract Reusable Heartbeat Utility**:
   - Create `src/lib/webrtc/dataChannelHeartbeat.ts` providing pure helper functions or a lightweight class `DataChannelMonitor` for:
     - Sending periodic heartbeat pings
     - Tracking round-trip latency
     - Triggering onDisconnect / timeout callback when pings go unanswered
2. **Add Unit Tests**:
   - Add Vitest tests for `dataChannelHeartbeat.test.ts` verifying timer cleanup on channel close and timeout firing on missed heartbeats.
3. **Refactor Host & Client**:
   - Refactor both `WebRTCHostManager.ts` and `useWebRTCClient.ts` to use `DataChannelMonitor`.
   - Remove the duplicate inline ping intervals and error listeners.

## Acceptance Criteria

- [ ] Code clones between `WebRTCHostManager.ts` and `useWebRTCClient.ts` eliminated (`npm run check:duplicates` passes).
- [ ] Unit tests for data channel heartbeat pass (`npm test`).
- [ ] Both host peer connections and client mobile connections maintain reliable heartbeats.
- [ ] Zero `any` types.

## Verification

```bash
npm run check:duplicates
npm test
npm run check:architecture:diff
npm run lint
```
