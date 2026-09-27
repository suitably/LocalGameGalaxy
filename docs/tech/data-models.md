---
type: Data Models Specification
title: Core Data Models Specification
description: Central specification for application data models, game state schemas, player definitions, and sync envelopes.
resource: src/
tags: [models, typescript, interfaces, schemas]
status: stable
generated: { by: antigravity/2.0, at: 2026-09-27T10:00:00Z }
verified: { by: process:ci, at: 2026-09-27T10:00:00Z }
sources:
  - id: game-registry
    resource: src/lib/gameRegistry.tsx
    title: Dynamic Game Registry
  - id: player-logic
    resource: src/modules/player-management/playerLogic.ts
    title: Shared Player Logic
---

# Core Data Models Specification

> [!IMPORTANT]
> This document specifies shared interfaces and data schemas across LocalGameGalaxy.

---

## 1. Game Registry Models (`src/lib/gameRegistry.tsx`)

Games register dynamically into the hub router using `GameDefinition`:

```typescript
export type GameCategory = 
  | 'all' 
  | 'dice' 
  | 'drawing' 
  | 'music' 
  | 'social_deduction' 
  | 'cards' 
  | 'party' 
  | 'puzzle';

export interface GameRouteDefinition {
  path: string;
  component: React.ReactNode;
}

export interface GameDefinition {
  id: string;
  route: string;
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  colorStart: string;
  colorEnd: string;
  hoverColor: string;
  component: React.ReactNode;
  category: GameCategory;
  hasSettings?: boolean;
  nestedRoutes?: GameRouteDefinition[];
  standaloneRoutes?: GameRouteDefinition[];
}
```

---

## 2. Shared Player Management (`src/modules/player-management`)

Used by GuessArt, Storyteller, Imposter, Werewolf, and Cards:

```typescript
export interface LobbyPlayer {
  id: string;
  name: string;
  color?: string;
  isHost?: boolean;
}

export interface PlayerConstraints {
  minPlayers: number;
  maxPlayers: number;
}
```

---

## 3. Asynchronous Sync Mailbox Envelopes (`src/modules/sync`)

Envelopes exchanged over MQTT brokers and BroadcastChannels:

```typescript
export interface MailboxMessage<T> {
  senderId: string;
  timestamp: number;
  payload: T;
}

export interface GameSnapshot<TState = unknown> {
  gameId: string;
  roundIndex: number;
  turnPlayerId: string;
  updatedAt: number;
  state: TState;
}
```

---

## 4. UltraStar Song & Lyric Models (`src/games/melodiq`)

Parsed representation of UltraStar TXT files:

```typescript
export interface ParsedNote {
  type: ':' | '*' | 'F' | 'R' | 'G'; // Normal, Golden, Freestyle, Rap, Golden Rap
  startBeat: number;
  durationBeats: number;
  pitch: number;                     // MIDI note pitch
  syllable: string;
}

export interface ParsedLine {
  notes: ParsedNote[];
  lineBreakBeat: number;
}

export interface ParsedSong {
  title: string;
  artist: string;
  bpm: number;
  gap: number;                       // Initial offset in ms
  lines: ParsedLine[];
  audioFile?: string;
  videoFile?: string;
}
```

---

## 5. Tabletop Engine Models (`src/games/tabletop`)

Schema for PlayingCards.io packages and custom board games:

```typescript
export interface TabletopWidget {
  id: string;
  type: 'card' | 'deck' | 'spinner' | 'dice' | 'token';
  x: number;
  y: number;
  zIndex: number;
  faceDown?: boolean;
  ownerId?: string | null;           // Private hand owner
  data?: Record<string, unknown>;
}

export interface TabletopGameDefinition {
  id: string;
  title: string;
  description?: string;
  version: string;
  boardWidth: number;
  boardHeight: number;
  backgroundColor?: string;
  backgroundImageUrl?: string;
  widgets: TabletopWidget[];
}
```

---

## 6. Social Deduction & Role Models (`src/games/werewolf`)

```typescript
export interface WerewolfPlayer {
  id: string;
  name: string;
  role: string | null;
  isAlive: boolean;
  protected?: boolean;
  infected?: boolean;
}

export interface RoleDefinition {
  id: string;
  nameKey: string;
  descriptionKey: string;
  team: 'villager' | 'werewolf' | 'neutral';
  order: number;                     // Night phase call order
}
```
