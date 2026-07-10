---
title: "[HIGH] Direct Database Coupling in Imposter Game Controller (ImposterGame.tsx)"
severity: high
type: maintainability
domain: architecture
lens: dependency-direction
labels:
  - "audit:architecture/dependency-direction"
---

## Summary
The main container/coordinator component `ImposterGame` in the Imposter game module directly imports the Dexie database `db` instance from the global infrastructure folder and queries it during the game initialization flow (`startGame`).

## Impact
Tightly coupling the controller/engine of a game module to the persistence database infrastructure violates dependency direction constraints. The core orchestration of game state, rules, and player roles should be decoupled from the details of the database implementation. This makes unit testing the game logic harder (requiring database mocks/execution environments) and increases the risk of breakages when database engines or schemas are refactored.

## Evidence
In [ImposterGame.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/ImposterGame.tsx#L15):
```typescript
import { db } from '../../lib/db';
```
And in [ImposterGame.tsx:L82-L89](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/ImposterGame.tsx#L82-L89):
```typescript
    const startGame = async (setup: { categories: DbCategory[]; imposterCount: number; timerLength: number }) => {
        // Fetch word pairs from selected categories
        const categoryIds = setup.categories.map(c => c.id);
        const pairs = await db.imposter_word_pairs
            .where('categoryIds')
            .anyOf(categoryIds)
            .toArray();
```

## Recommended Fix
Extract the database query into an abstract service, a data provider, or a custom React hook (e.g., `useWordPairs`) that hides the details of the database querying behind a clean, testable interface.

## References
- Clean Architecture (Boundary decoupling)
- SOLID Principles: Dependency Inversion Principle

## Validation
- attacker_source: n/a
- missing_guard: n/a
- sink_effect: n/a
- preconditions: none
- proof_anchors: src/games/imposter/ImposterGame.tsx:15
- suggested_validation: grep -n "db\.imposter_word_pairs" src/games/imposter/ImposterGame.tsx
