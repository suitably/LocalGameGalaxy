# Stale Pitch Scoring Fix Plan

This plan details the fix for the stale pitch scoring issue in `WebRTCMicManager` (Issue #15).

## Goal
Prevent players from receiving undeserved points and combos indefinitely when their WebRTC pitch messages stop. This is solved by introducing a timestamp field on the cached pitch data (`lastPitch`) and checking if the pitch message is stale (older than 200ms) in `getPitch()`.

## Proposed Changes
1. **`src/games/melodiq/audio/WebRTCMicManager.ts`**:
   - Extend the inline type for `lastPitch` in `MicRemotePeer` type definition to require a `timestamp: number` field.
   - Update `handleCustomWebRTCMessage` to capture the current timestamp `Date.now()` when a pitch message is received.
   - Update `getPitch` to retrieve the pitch only if the elapsed time since its `timestamp` is less than 200ms. If it is 200ms or older, clear `lastPitch` to `null` and return `null`.

## Verification Plan
1. Check that the workspace compiles (`npm run build`) and lints (`npm run lint`) without errors.
2. Verify that `getPitch` correctly checks and clears stale pitch values.
3. Write a TypeScript script to verify the logic of `WebRTCMicManager` getPitch TTL check.

ID: STALE-PITCH-SCORING-PLAN
