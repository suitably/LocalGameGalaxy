---
title: "[HIGH] Direct Database Coupling in Melodiq Gameplay Session (useSessionEnd.ts)"
severity: high
type: maintainability
domain: architecture
lens: dependency-direction
labels:
  - "audit:architecture/dependency-direction"
---

## Summary
The core gameplay session hook `useSessionEnd.ts` in the Melodiq game module directly imports the Melodiq Dexie database (`MelodiqDB`) instance to record player scores and retrieve historical statistics when a song finishes.

## Impact
Coupling the core session/gameplay loop directly to the IndexedDB persistence layer violates dependency direction rules. The scoring engine and game session lifecycle should remain decoupled from concrete storage adapters. Direct references to database tables (`db.scores`) prevent testing session transition behaviors in isolation without mocking the entire database instance, and couple the gameplay module directly to the Dexie library.

## Evidence
In [useSessionEnd.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/hooks/useSessionEnd.ts#L2):
```typescript
import db from '../../db';
```
And in [useSessionEnd.ts:L58-L67](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/hooks/useSessionEnd.ts#L58-L67):
```typescript
                    await db.scores.add({
                        songId: song.id,
                        profileId: p.config.id,
                        score: totalScore,
                        date: isoDate
                    });

                    const allScores = await db.scores
                        .where({ songId: song.id, profileId: p.config.id })
                        .toArray();
```

## Recommended Fix
Inject a `saveScore` and `getPlayerScores` callback (or a score repository interface) into the `useSessionEnd` hook, or delegate the persistence responsibility to a container component that wraps the game session.

## References
- Clean Architecture (Dependency Inversion)
- SOLID Principles: Dependency Inversion Principle

## Validation
- attacker_source: n/a
- missing_guard: n/a
- sink_effect: n/a
- preconditions: none
- proof_anchors: src/games/melodiq/gameplay/hooks/useSessionEnd.ts:2
- suggested_validation: grep -n "import db" src/games/melodiq/gameplay/hooks/useSessionEnd.ts
