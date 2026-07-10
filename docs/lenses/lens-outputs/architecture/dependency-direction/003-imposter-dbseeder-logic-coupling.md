---
title: "[MEDIUM] Domain Logic Coupling to Database Infrastructure in Imposter dbSeeder"
severity: medium
type: maintainability
domain: architecture
lens: dependency-direction
labels:
  - "audit:architecture/dependency-direction"
---

## Summary
The database seeder file `dbSeeder.ts` resides inside the game's core logic layer (`src/games/imposter/logic/`), but directly imports the Dexie database `db` instance from `src/lib/db.ts` to perform insert and count operations.

## Impact
Files residing under a game module's `logic/` directory are expected to represent frameworks-independent and persistence-independent business rules (reducers, pure functions, and domain types). Direct references to low-level database operations (`db.imposter_categories.bulkPut`, etc.) inside the `logic/` directory violate architectural boundary segregation, making it difficult to package or test the domain logic module in isolation.

## Evidence
In [dbSeeder.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/logic/dbSeeder.ts#L1):
```typescript
import { db } from '../../../lib/db';
```
And in [dbSeeder.ts:L11-L12](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/logic/dbSeeder.ts#L11-L12):
```typescript
    const categoryCount = await db.imposter_categories.count();
    const wordPairCount = await db.imposter_word_pairs.count();
```

## Recommended Fix
Move `dbSeeder.ts` out of the pure domain `logic/` folder into an infrastructure/adapter layer or feature root level (e.g., `src/games/imposter/dbSeeder.ts`), separating seeder routines from the core rules, reducers, and types of the Imposter game.

## References
- Clean Architecture (Architectural Boundaries)
- SOLID Principles: Separation of Concerns

## Validation
- attacker_source: n/a
- missing_guard: n/a
- sink_effect: n/a
- preconditions: none
- proof_anchors: src/games/imposter/logic/dbSeeder.ts:1
- suggested_validation: grep -n "import.*db" src/games/imposter/logic/dbSeeder.ts
