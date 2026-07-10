---
title: "[MEDIUM] Missing Public API Barrel File for WebRTC Library Module"
severity: medium
type: maintainability
domain: Architecture
lens: module-boundaries
labels:
  - "audit:architecture/module-boundaries"
---

## Summary
The `webrtc` library module inside `src/lib/webrtc` does not define a public entry point/barrel file (e.g. `src/lib/webrtc/index.ts`). Instead, consumer files within the `melodiq` module make deep imports targeting internal implementation files: `WebRTCHostContext.tsx`, `WebRTCHostManager.ts`, and `useWebRTCClient.ts`.

## Impact
Consumers are tightly coupled to the exact file names and structure inside `src/lib/webrtc/`. This limits the ability of maintainers to refactor or restructure WebRTC logic (e.g. splitting large files or changing file names) without breaking external consumers.

## Evidence
- In [src/games/melodiq/audio/WebRTCContext.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/audio/WebRTCContext.tsx) line 2:
```typescript
import { WebRTCHostProvider, useWebRTCHost, WebRTCHostContext } from '../../../lib/webrtc/WebRTCHostContext';
```
- In [src/games/melodiq/audio/WebRTCMicManager.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/audio/WebRTCMicManager.ts) line 3:
```typescript
import { WebRTCHostManager, type RemotePeerBase, type WebRTCHostManagerCallbacks } from '../../../lib/webrtc/WebRTCHostManager';
```
- In [src/games/melodiq/MelodiqTV.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/MelodiqTV.tsx) line 6:
```typescript
import { WebRTCHostContext, type WebRTCHostContextType } from '../../lib/webrtc/WebRTCHostContext';
```
- In [src/games/melodiq/PhoneClientEngine.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/PhoneClientEngine.tsx) line 2:
```typescript
import { useWebRTCClient } from '../../lib/webrtc/useWebRTCClient';
```

## Recommended Fix
1. Create a barrel file `src/lib/webrtc/index.ts` to export all public symbols:
```typescript
export { WebRTCHostProvider, useWebRTCHost, WebRTCHostContext } from './WebRTCHostContext';
export type { WebRTCHostContextType } from './WebRTCHostContext';
export { WebRTCHostManager } from './WebRTCHostManager';
export type { RemotePeerBase, WebRTCHostManagerCallbacks } from './WebRTCHostManager';
export { useWebRTCClient } from './useWebRTCClient';
```
2. Refactor imports in `melodiq` components to target `src/lib/webrtc` instead of deep internal files. For example, in `src/games/melodiq/PhoneClientEngine.tsx`:
```typescript
import { useWebRTCClient } from '../../lib/webrtc';
```

## References
- Clean Architecture: Encapsulation and Separation of Concerns
- TypeScript Module Barrel Files Pattern

## Validation
- attacker_source — n/a
- missing_guard — n/a
- sink_effect — n/a
- preconditions — none
- proof_anchors — src/games/melodiq/audio/WebRTCContext.tsx:2, src/games/melodiq/audio/WebRTCMicManager.ts:3, src/games/melodiq/MelodiqTV.tsx:6, src/games/melodiq/PhoneClientEngine.tsx:2
- suggested_validation — grep -rn -E "lib/webrtc/WebRTCHostContext|lib/webrtc/WebRTCHostManager|lib/webrtc/useWebRTCClient" /home/deck/Projects/LocalGameGalaxy/src/games/melodiq/
