---
title: "[HIGH] Direct Database Coupling in Imposter Game UI (GameSetup.tsx)"
severity: high
type: maintainability
domain: architecture
lens: dependency-direction
labels:
  - "audit:architecture/dependency-direction"
---

## Summary
The UI/Presentational component `GameSetup` in the Imposter game module directly imports the Dexie database `db` instance and queries the database (`imposter_categories` table) inside its `useEffect` hook.

## Impact
Coupling the UI presentation layer directly to the database infrastructure (`Dexie` / IndexedDB) violates the Single Responsibility Principle and the Dependency Inversion Principle. UI components should remain independent of storage/persistence mechanisms. This coupling prevents testing the UI in isolation without mocking the entire database, and makes swapping the storage layer in the future more difficult.

## Evidence
In [GameSetup.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/components/GameSetup.tsx#L10):
```typescript
import { db } from '../../../lib/db';
```
And in [GameSetup.tsx:L32-L38](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/components/GameSetup.tsx#L32-L38):
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

## Recommended Fix
Delegate the database loading to a custom hook (e.g., `useImposterCategories`) or pass the categories down as props from a container component, keeping the UI components completely isolated from Dexie/IndexedDB database instances.

## References
- Clean Architecture (Dependency Rule)
- SOLID Principles: Dependency Inversion Principle

## Validation
- attacker_source: n/a
- missing_guard: n/a
- sink_effect: n/a
- preconditions: none
- proof_anchors: src/games/imposter/components/GameSetup.tsx:10
- suggested_validation: grep -n "import.*db" src/games/imposter/components/GameSetup.tsx
