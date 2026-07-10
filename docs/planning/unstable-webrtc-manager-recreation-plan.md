# Unstable WebRTC Manager Recreation Fix Plan

This plan details the fix for the WebRTC Host Manager teardown/recreation bug where an inline callback `createManager` is passed to `<WebRTCHostProvider>` in `WebRTCContext.tsx`, causing the manager to re-initialize on every render of `WebRTCProvider`.

## Goal
Extract the inline `createManager` callback function to a static, module-level function in `src/games/melodiq/audio/WebRTCContext.tsx` to ensure reference stability across renders, preventing the lifecycle `useEffect` in `WebRTCHostContext.tsx` from continually recreating the manager and dropping connections.

## Proposed Changes
1. **`src/games/melodiq/audio/WebRTCContext.tsx`**:
   - Extract the inline `createManager` lambda to a module-scoped function named `createMicManager`.
   - Pass `createMicManager` as the value of the `createManager` prop.

## Verification Plan
1. Check that the compilation of the workspace (`npm run build`) succeeds without any TypeScript errors.
2. Verify the correct function extraction and reference passing via code inspection.

ID: UNSTABLE-WEBRTC-MANAGER-RECREATION-PLAN
