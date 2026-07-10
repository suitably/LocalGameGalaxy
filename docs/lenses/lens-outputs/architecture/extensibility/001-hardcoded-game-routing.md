---
title: "[MEDIUM] Hardcoded Game Routing and Selection UI violates the Open/Closed Principle"
severity: medium
type: maintainability
domain: architecture
lens: extensibility
labels:
  - "audit:architecture/extensibility"
---

## Summary
The list of available games in the LocalGameGalaxy platform is hardcoded in two key files: `src/App.tsx` (for routing and lazy loading) and `src/features/hub/Hub.tsx` (for selection UI cards). Adding a new game requires direct modification of these stable core files instead of registering the game via a registry or plugin system.

## Impact
Adding or removing a game violates the Open/Closed Principle (OCP), leading to:
- High maintenance overhead and friction when developing new games.
- Risk of breaking core navigation and application initialization when modifying `App.tsx`.
- Inability to support third-party dynamic game plugins or modular setups.

## Evidence

In `src/App.tsx`:
```typescript
const WerewolfGame = lazy(() => import('./games/werewolf/WerewolfGame').then(m => ({ default: m.WerewolfGame })));
const ImposterGame = lazy(() => import('./games/imposter/ImposterGame').then(m => ({ default: m.ImposterGame })));
const MelodiqGame = lazy(() => import('./games/melodiq/MelodiqGame').then(m => ({ default: m.MelodiqGame })));
```
And the routes are hardcoded statically:
```typescript
        <Route path="games/werewolf" element={
          <Suspense fallback={<LoadingFallback />}>
            <WerewolfGame />
          </Suspense>
        } />
        <Route path="games/imposter" element={
          <Suspense fallback={<LoadingFallback />}>
            <ImposterGame />
          </Suspense>
        } />
        <Route path="games/melodiq" element={
          <Suspense fallback={<LoadingFallback />}>
            <MelodiqGame />
          </Suspense>
        } />
```

In `src/features/hub/Hub.tsx`:
```typescript
                <Card sx={cardStyle('#90caf9', '#1e88e5', '#1e88e5')}>
                    <CardActionArea
                        onClick={() => navigate('/games/werewolf')}
                        sx={{ height: '100%' }}
                    >
...
                <Card sx={cardStyle('#f48fb1', '#d81b60', '#d81b60')}>
                    <CardActionArea
                        onClick={() => navigate('/games/imposter')}
                        sx={{ height: '100%' }}
                    >
...
```

## Recommended Fix
Introduce a centralized Game Registry that allows games to be registered dynamically:
1. Define a `GameDefinition` type in `src/types/game.ts`:
   ```typescript
   export interface GameDefinition {
     id: string;
     nameKey: string;
     descriptionKey: string;
     path: string;
     component: React.ComponentType;
     icon: React.ReactNode;
     themeColors: {
       start: string;
       end: string;
       hover: string;
     };
   }
   ```
2. Create a registry file `src/lib/gameRegistry.ts` that exports a list of registered games.
3. Dynamically map over the registered games in `src/App.tsx` to generate the `<Route>` components.
4. Dynamically map over the registered games in `src/features/hub/Hub.tsx` to render the cards.

## References
- Open/Closed Principle (SOLID principles)
- Strategy/Registry Pattern for Extensible Architectures

## Validation
- attacker_source: n/a
- missing_guard: n/a
- sink_effect: n/a
- preconditions: none
- proof_anchors:
  - src/App.tsx:10-12
  - src/App.tsx:58-72
  - src/features/hub/Hub.tsx:95-144
- suggested_validation: grep -nE "WerewolfGame|ImposterGame|MelodiqGame" src/App.tsx src/features/hub/Hub.tsx
