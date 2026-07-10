---
title: "[MEDIUM] Missing Public API Barrel File and Deep Path Imports in Melodiq Game Module"
severity: medium
type: maintainability
domain: Architecture
lens: module-boundaries
labels:
  - "audit:architecture/module-boundaries"
---

## Summary
The `melodiq` game module does not define a public API surface via a barrel/index file (e.g. `src/games/melodiq/index.ts`). Consequently, external consumers (such as `src/App.tsx`) import deep internal implementation details of the module, specifically `src/games/melodiq/components/MelodiqQueue.tsx` and `src/games/melodiq/hooks/useSongs.tsx`.

## Impact
Deep path imports couple external modules to the internal directory structure and layout of the `melodiq` module. If internals are relocated, renamed, or refactored, it breaks the consumer, increasing maintenance overhead and violating encapsulation boundaries.

## Evidence
In [src/App.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/App.tsx):
- Line 14:
```typescript
const MelodiqQueue = lazy(() => import('./games/melodiq/components/MelodiqQueue').then(m => ({ default: m.MelodiqQueue })));
```
- Line 24:
```typescript
import { SongsProvider } from './games/melodiq/hooks/useSongs';
```

## Recommended Fix
1. Create a public API entry point file `src/games/melodiq/index.ts` that explicitly re-exports only the public components, providers, and hooks needed by external modules:
```typescript
export { MelodiqGame } from './MelodiqGame';
export { MelodiqTV } from './MelodiqTV';
export { MelodiqQueue } from './components/MelodiqQueue';
export { SongsProvider } from './hooks/useSongs';
```
2. Refactor imports in `src/App.tsx` to reference the public API surface:
```typescript
const MelodiqGame = lazy(() => import('./games/melodiq').then(m => ({ default: m.MelodiqGame })));
const MelodiqQueue = lazy(() => import('./games/melodiq').then(m => ({ default: m.MelodiqQueue })));
const MelodiqTV = lazy(() => import('./games/melodiq').then(m => ({ default: m.MelodiqTV })));
import { SongsProvider } from './games/melodiq';
```

## References
- SOLID: Interface Segregation & Single Responsibility Principles
- TypeScript / JavaScript Module Barrel Files Pattern

## Validation
- attacker_source — n/a
- missing_guard — n/a
- sink_effect — n/a
- preconditions — none
- proof_anchors — src/App.tsx:14, src/App.tsx:24
- suggested_validation — grep -n -E "games/melodiq/components/|games/melodiq/hooks/" /home/deck/Projects/LocalGameGalaxy/src/App.tsx
