---
title: "[LOW] Missing Public API Barrel Files for Werewolf and Imposter Game Modules"
severity: low
type: maintainability
domain: Architecture
lens: module-boundaries
labels:
  - "audit:architecture/module-boundaries"
---

## Summary
The `werewolf` and `imposter` game modules do not define public API surfaces via barrel/index files (e.g. `src/games/werewolf/index.ts` and `src/games/imposter/index.ts`). External modules (such as `src/App.tsx`) import the root component files (`WerewolfGame.tsx`, `ImposterGame.tsx`) directly instead of importing them through a module-level entry point.

## Impact
This exposes the internal structure of the game directories directly to external consumers and lacks an explicit API contract. If internal files are renamed or reorganized, external routes and loaders break.

## Evidence
In [src/App.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/App.tsx):
- Line 10:
```typescript
const WerewolfGame = lazy(() => import('./games/werewolf/WerewolfGame').then(m => ({ default: m.WerewolfGame })));
```
- Line 11:
```typescript
const ImposterGame = lazy(() => import('./games/imposter/ImposterGame').then(m => ({ default: m.ImposterGame })));
```

## Recommended Fix
1. Create `src/games/werewolf/index.ts` containing:
```typescript
export { WerewolfGame } from './WerewolfGame';
```
2. Create `src/games/imposter/index.ts` containing:
```typescript
export { ImposterGame } from './ImposterGame';
```
3. Refactor `src/App.tsx` imports:
```typescript
const WerewolfGame = lazy(() => import('./games/werewolf').then(m => ({ default: m.WerewolfGame })));
const ImposterGame = lazy(() => import('./games/imposter').then(m => ({ default: m.ImposterGame })));
```

## References
- SOLID Principles
- TypeScript Module Barrel Files Pattern

## Validation
- attacker_source — n/a
- missing_guard — n/a
- sink_effect — n/a
- preconditions — none
- proof_anchors — src/App.tsx:10, src/App.tsx:11
- suggested_validation — grep -n -E "games/werewolf/WerewolfGame|games/imposter/ImposterGame" /home/deck/Projects/LocalGameGalaxy/src/App.tsx
