---
title: "[MEDIUM] Direct Database Queries Inside Imposter Game UI Components"
severity: medium
type: maintainability
domain: Architecture
lens: separation-of-concerns
labels:
  - "audit:architecture/separation-of-concerns"
---

## Summary
The Imposter game UI components (`ImposterGame.tsx` and `GameSetup.tsx`) import the application's global Dexie database instance (`db`) and perform database queries directly within their local rendering contexts and event handlers.

## Impact
This direct database access leaks data-access layer concerns into the presentation layer:
1. **Tight Coupling**: UI components are coupled to Dexie-specific database methods (e.g., `.toArray()`, `.where()`, `.anyOf()`). Swapping the underlying storage library (e.g. to SQLite, local files, or a backend API) requires editing components.
2. **SRP Violation**: UI components are responsible for both rendering layouts and executing low-level IndexedDB database queries.
3. **Impedes Unit Testing**: It is difficult to write clean, isolated unit tests for `GameSetup` or `ImposterGame` since they require mocking the global database module and table methods.

## Evidence
- **GameSetup Category Fetching**: Queries categories from the database inside `useEffect`.
  - [GameSetup.tsx:L10](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/components/GameSetup.tsx#L10) (Importing DB)
  - [GameSetup.tsx:L32-38](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/components/GameSetup.tsx#L32-L38)
  ```typescript
  // Fetch categories from database
  useEffect(() => {
      const fetchCategories = async () => {
          const cats = await db.imposter_categories.toArray();
          setAllCategories(cats);
      };
      fetchCategories();
  }, []);
  ```
- **ImposterGame Word Retrieval**: Queries word pairs directly in the `startGame` event handler.
  - [ImposterGame.tsx:L15](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/ImposterGame.tsx#L15) (Importing DB)
  - [ImposterGame.tsx:L83-88](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/ImposterGame.tsx#L83-L88)
  ```typescript
  // Fetch word pairs from selected categories
  const categoryIds = setup.categories.map(c => c.id);
  const pairs = await db.imposter_word_pairs
      .where('categoryIds')
      .anyOf(categoryIds)
      .toArray();
  ```

## Recommended Fix
Extract these database access queries into a repository file (e.g., `src/games/imposter/logic/imposterRepository.ts`) or dedicated custom React hooks.

Example hook for fetching categories (`src/games/imposter/hooks/useImposterCategories.ts`):
```typescript
import { useState, useEffect } from 'react';
import { db } from '../../../lib/db';
import type { DbCategory } from '../logic/types';

export function useImposterCategories() {
    const [categories, setCategories] = useState<DbCategory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        db.imposter_categories.toArray()
            .then(setCategories)
            .finally(() => setLoading(false));
    }, []);

    return { categories, loading };
}
```

This encapsulates database interactions, mirroring the design pattern used in the `melodiq` module (where DB access is wrapped in hooks like `usePlaylists` and `useHistory`).

## References
- Clean Architecture / Data Access Layer Abstraction patterns
- SOLID Principles: Single Responsibility Principle (SRP) in [AGENTS.md](file:///home/deck/Projects/LocalGameGalaxy/AGENTS.md)

## Validation
- attacker_source: n/a
- missing_guard: n/a
- sink_effect: n/a
- preconditions: none
- proof_anchors:
  - `src/games/imposter/ImposterGame.tsx:85`
  - `src/games/imposter/components/GameSetup.tsx:34`
- suggested_validation: grep -rn "db\.imposter" src/games/imposter/
