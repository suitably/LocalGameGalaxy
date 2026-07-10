---
title: "[MEDIUM] Database Initialization Race Condition Prevents Imposter Game Start"
severity: medium
type: reliability-bug
domain: Database State Initialization
lens: state-architecture
labels:
  - "audit:architecture/state-architecture"
---

## Summary
In [ImposterGame.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/ImposterGame.tsx#L43-L45), the database seeding process is initiated on mount using a fire-and-forget asynchronous callback inside `useEffect`:
```typescript
    // Initialize database
    useEffect(() => {
        seedImposterDatabase();
    }, []);
```

However, the component does not check whether the seeding is complete. If the user quickly sets up the players and clicks "Start Game" before `seedImposterDatabase()` finishes writing category and word pair structures to Dexie IndexedDB, the game query returns no word pairs:
```typescript
        const pairs = await db.imposter_word_pairs
            .where('categoryIds')
            .anyOf(categoryIds)
            .toArray();

        if (pairs.length === 0) return;
```
If `pairs.length === 0`, `startGame` silently aborts execution, leaving the game in the setup screen without any feedback or logs in the user interface.

## Impact
Race condition that causes silent failures on first launch or slow devices (e.g. mobile phones where IndexedDB writes are throttled), rendering the "Start Game" button unresponsive.

## Evidence
In [ImposterGame.tsx:43-45](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/ImposterGame.tsx#L43-L45):
```typescript
    // Initialize database
    useEffect(() => {
        seedImposterDatabase();
    }, []);
```
In [ImposterGame.tsx:82-90](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/ImposterGame.tsx#L82-L90):
```typescript
    const startGame = async (setup: { categories: DbCategory[]; imposterCount: number; timerLength: number }) => {
        // Fetch word pairs from selected categories
        const categoryIds = setup.categories.map(c => c.id);
        const pairs = await db.imposter_word_pairs
            .where('categoryIds')
            .anyOf(categoryIds)
            .toArray();

        if (pairs.length === 0) return;
```

## Recommended Fix
Track the database initialization state in the component and disable the "Start Game" action or display a loader until seeding is complete:

```typescript
    const [isDbSeeding, setIsDbSeeding] = useState(true);

    // Initialize database
    useEffect(() => {
        seedImposterDatabase().finally(() => {
            setIsDbSeeding(false);
        });
    }, []);
```
In the rendering logic of `GameSetup` or the button in the lobby, disable "Start Game" when `isDbSeeding` is true.

## References
- Dexie.js: [Dexie.on.ready hook](https://dexie.org/docs/Dexie/Dexie.on.ready)
- React State: [Asynchronous Data Fetching](https://react.dev/reference/react/useEffect#fetching-data-with-effects)

## Validation
- attacker_source — n/a
- missing_guard — n/a
- sink_effect — n/a
- preconditions — none
- proof_anchors — src/games/imposter/ImposterGame.tsx:43-45
- suggested_validation: grep -n "seedImposterDatabase()" src/games/imposter/ImposterGame.tsx
