---
title: "[MEDIUM] Tight Coupling of Game-Specific Database Schemas in Global Database"
severity: medium
type: maintainability
domain: Architecture/Coupling
lens: architecture/coupling
labels:
  - "audit:architecture/coupling"
---

## Summary
The global database configuration file (`src/lib/db.ts`) directly exposes schemas and tables specific to individual games (such as the Imposter game's `imposter_categories` and `imposter_word_pairs`), rather than keeping them encapsulated within their respective game module directories.

## Impact
This leaks game-specific concerns into a global infrastructure file. When adding, modifying, or removing a game (e.g., adding a new game that needs a database or dropping the Imposter game), developers must modify the global `db.ts` file, update its schema version, and run migrations there. This violates the Open-Closed Principle (OCP) and Single Responsibility Principle (SRP). Contrast this with the `melodiq` game, which manages its own Dexie database instance independently inside `src/games/melodiq/db.ts`.

## Evidence
In [src/lib/db.ts](file:///home/deck/Projects/LocalGameGalaxy/src/lib/db.ts#L12-L33):
```typescript
export class LocalGameDatabase extends Dexie {
    games!: Table<GameRecord>;
    imposter_categories!: Table<{
        id: string;
        name: { en: string; de: string };
    }>;
    imposter_word_pairs!: Table<{
        id?: number;
        words: { en: [string, string]; de: [string, string] };
        categoryIds: string[];
    }>;

    constructor() {
        super('LocalGameGalaxyDB');
        this.version(1).stores({
            games: '++id, gameType, date'
        });
        this.version(2).stores({
            imposter_categories: 'id',
            imposter_word_pairs: '++id, *categoryIds'
        });
    }
}
```

## Recommended Fix
Refactor database configurations to follow a modular design:
1. Define the Imposter-specific database inside a dedicated database module under the imposter directory, e.g., `src/games/imposter/logic/db.ts`, similar to how `melodiq` organizes its storage in `src/games/melodiq/db.ts`.
2. Keep `src/lib/db.ts` strictly for cross-cutting platform-level concerns (like general games history records and user preferences).

## References
- Domain-Driven Design (DDD) - Bounded Contexts
- SOLID Principles: Single Responsibility Principle (SRP)

## Validation
- attacker_source: n/a
- missing_guard: n/a
- sink_effect: n/a
- preconditions: none
- proof_anchors: src/lib/db.ts:14-22
- suggested_validation: grep -n "imposter_categories" src/lib/db.ts
