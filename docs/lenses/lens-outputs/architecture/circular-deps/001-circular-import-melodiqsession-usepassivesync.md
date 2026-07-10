---
title: "[MEDIUM] Circular import between MelodiqSession component and usePassiveSync hook"
severity: medium
type: maintainability
domain: architecture
lens: circular-deps
labels:
  - "audit:architecture/circular-deps"
---

## Summary
The codebase contains a circular dependency between the main `MelodiqSession` gameplay component and the custom hook `usePassiveSync`. The `MelodiqSession` component imports and invokes `usePassiveSync` for handling passive state updates, while the `usePassiveSync` hook imports the `PassiveGameState` interface defined within `MelodiqSession.tsx`.

- **Component Import**: [MelodiqSession.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/MelodiqSession.tsx#L18) imports `usePassiveSync` from `./hooks/usePassiveSync`.
- **Hook Import**: [usePassiveSync.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/hooks/usePassiveSync.ts#L3) imports `PassiveGameState` from `../MelodiqSession`.

## Impact
While this import loop is currently type-only (using `import { type PassiveGameState }`), it compromises module independence, violates clean architectural layers (hooks should not import from their parent/calling container components), and can lead to runtime issues or build warnings depending on transpilation, bundler configuration, or if value imports are later introduced. In addition, static analysis tools (e.g., `madge`) flag this as a circular dependency, cluttering the linting and health metrics of the repository.

## Evidence
1. In `src/games/melodiq/gameplay/MelodiqSession.tsx` at line 18:
```typescript
import { usePassiveSync } from './hooks/usePassiveSync';
```

2. In `src/games/melodiq/gameplay/hooks/usePassiveSync.ts` at line 3:
```typescript
import { type PassiveGameState } from '../MelodiqSession';
```

## Recommended Fix
De-couple the hook from `MelodiqSession.tsx` by moving the gameplay synchronization state interfaces (`PassivePlayerState` and `PassiveGameState`) to the shared types definitions module `src/games/melodiq/types.ts`.

1. **Move Definitions**:
   In `src/games/melodiq/types.ts`, import `PitchResult` from `./audio/MicrophoneManager`, `SungSegment` from `./gameplay/PitchVisualizer`, and `RatingType` from `./gameplay/ScoreDisplay`. Then, export `PassivePlayerState` and `PassiveGameState` from there.
2. **Update MelodiqSession.tsx**:
   Remove the interface declarations for `PassivePlayerState` and `PassiveGameState` and import them from `../types`.
3. **Update usePassiveSync.ts**:
   Change the import of `PassiveGameState` to reference `../../types` instead of `../MelodiqSession`.
4. **Update MelodiqTV.tsx**:
   Update `MelodiqTV.tsx` to import `PassiveGameState` from `./types` instead of `./gameplay/MelodiqSession`.

## References
- [Vite/ESBuild Circular Dependencies Guide](https://vite.dev/guide/features.html)
- [Software Architecture: Clean Code & Decoupling Hooks from UI Components](https://react.dev/learn/reusing-logic-with-custom-hooks)

## Validation
- attacker_source: n/a
- missing_guard: n/a
- sink_effect: n/a
- preconditions: none
- proof_anchors:
  - src/games/melodiq/gameplay/MelodiqSession.tsx:18
  - src/games/melodiq/gameplay/hooks/usePassiveSync.ts:3
- suggested_validation: npx madge --circular --extensions ts,tsx src
