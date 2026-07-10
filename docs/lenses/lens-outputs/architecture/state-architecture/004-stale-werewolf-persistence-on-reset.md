---
title: "[MEDIUM] Stale Game Over State Persists in localStorage After Werewolf Game Reset"
severity: medium
type: reliability-bug
domain: Game State Persistence
lens: state-architecture
labels:
  - "audit:architecture/state-architecture"
---

## Summary
In the Werewolf game lobby/content screen [WerewolfGame.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/werewolf/WerewolfGame.tsx#L65-L69), the state changes are tracked and saved in `localStorage` via a `useEffect` hook:
```typescript
    useEffect(() => {
        if (isInitialized) {
            saveGameState(gameState);
        }
    }, [gameState, isInitialized, saveGameState]);
```

However, when a game finishes (`GAME_OVER` phase) and the user resets the game by clicking the "Play Again" button (which dispatches a `RESET_GAME` action, resetting phase to `SETUP`), the game state persistence utility `saveGameState` simply ignores the state update because it has a guard to skip saving during the `SETUP` phase. It does not clear the existing completed game data from the persistence layer.

## Impact
If the user leaves the page or refreshes the application, they are greeted on mount with the "Continue Game" dialog because the completed game's data is still present in `localStorage`. Continuing it restores a finished game instead of allowing the user to start a clean new game session.

## Evidence
In [useGameStatePersistence.ts:16-23](file:///home/deck/Projects/LocalGameGalaxy/src/games/werewolf/hooks/useGameStatePersistence.ts#L16-L23), `saveGameState` ignores the `SETUP` phase but does not clean up:
```typescript
    const saveGameState = useCallback((state: GameState) => {
        // Only save if game has started (not in SETUP phase)
        if (state.phase !== 'SETUP') {
            const dataToSave = {
                state,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        }
    }, []);
```

## Recommended Fix
Modify `saveGameState` to clear the `localStorage` key when the phase transitions to `SETUP` or `GAME_OVER`, ensuring stale states are deleted from the persistence layer:

```typescript
    const saveGameState = useCallback((state: GameState) => {
        if (state.phase === 'SETUP' || state.phase === 'GAME_OVER') {
            localStorage.removeItem(STORAGE_KEY);
        } else {
            const dataToSave = {
                state,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        }
    }, []);
```

## References
- React Reducer State Design Patterns: [Resetting State Cleanly](https://react.dev/learn/extracting-state-logic-into-a-reducer)

## Validation
- attacker_source — n/a
- missing_guard — n/a
- sink_effect — n/a
- preconditions — none
- proof_anchors — src/games/werewolf/hooks/useGameStatePersistence.ts:16-23
- suggested_validation: grep -n "saveGameState(gameState)" src/games/werewolf/WerewolfGame.tsx
