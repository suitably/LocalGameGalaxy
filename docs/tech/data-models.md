# Data Models [ID: TECH-MODELS]

This document outlines the core data structures used in the application.

## 1. Game State (Werewolf Example)

Most games follow a similar pattern, using a `GameState` object.

### `Player`
Represents a single participant.
```typescript
interface Player {
    id: string;
    name: string;
    role: Role | null; // e.g., 'VILLAGER', 'WEREWOLF'
    isAlive: boolean;
    needsToAct: boolean; // True if player needs to perform an action this phase
    powerState: PlayerPowerState; // Transient state (potions, infections, etc.)
}
```

### `GameState`
The root state object for the game reducer.
```typescript
interface GameState {
    players: Player[];
    phase: GamePhase; // 'SETUP', 'NIGHT', 'DAY', 'VOTING', etc.
    round: number;
    nightActionLog: string[]; // History of actions
    winner: 'VILLAGERS' | 'WEREWOLVES' | ... | null;
}
```

## 2. Roles & Abilities

Roles are defined by `RoleDefinition`.
```typescript
interface RoleDefinition {
    id: string;
    description: string;
    alignment: 'VILLAGER' | 'WEREWOLF' | 'NEUTRAL';
    abilities: Ability[]; // Defines what they can do at night
}
```
