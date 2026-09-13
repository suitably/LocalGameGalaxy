---
title: "[Feature][Tabletop] Define TypeScript Schema with Play Modes and PCIO/JSON Parser"
labels: ["tabletop", "parser", "schema", "feature", "priority:high"]
assignees: []
---

## Summary
Define the core domain types and a robust file parser for declarative tabletop games in LocalGameGalaxy. The schema must explicitly support game play modes (`party_multi_device`, `local_pass_and_play`, `solo`) and categorize widgets into public table elements (board, decks, drop targets, dice, counters) and private player elements (hands tied to player seats). The parser must ingest PlayingCards.io (`.pcio` ZIP archives) and JSON definitions, normalizing them into `TabletopGameDefinition`.

## Architectural Context & Guidelines
- **Target Location**: `src/games/tabletop/logic/`
- **Zero-Tolerance Anti-Patterns**: No `any`, no native dialogs, no cross-game imports.
- **Pure Functions**: Pure TypeScript with zero React/DOM dependencies, 100% testable via Vitest.
- **Decompression**: Use `fflate` or browser `DecompressionStream` to extract `manifest.json` / `state.json` and custom image assets from `.pcio` (ZIP) files.

## Problem Details & Domain Specification

Every game must declare:
1. **Metadata & Play Modes**:
   - `supportedModes`: `('party_multi_device' | 'local_pass_and_play' | 'solo')[]`.
   - `minPlayers`, `maxPlayers`, `name`, `description`, `author`, `version`.
2. **Widget Categorization for Dual-Role Rendering (TV vs. Phone)**:
   - **Public Table Widgets (`ownerSeat === undefined`)**:
     - `board`: Dimensions, background image or color, grid snap.
     - `deck`: Card stack with draw capabilities.
     - `holder` with `dropTarget: true`: Shared discard piles, play zones, or tableau fields.
     - `die` / `spinner`: Public randomizers.
     - `token`: Movable markers.
   - **Private Player Widgets (`ownerSeat !== undefined` or `isHand: true`)**:
     - `holder` with `isHand: true`: Represents a player's private hand. Hidden on shared TV screen (displayed only as card back count) and displayed openly on the respective player's smartphone controller!

## File Paths to Create
- `src/games/tabletop/logic/types.ts`: Domain models, discriminated unions, play modes.
- `src/games/tabletop/logic/pcioParser.ts`: Pure parser `parsePcioFile(file: ArrayBuffer | string): Promise<TabletopGameDefinition>`.
- `src/games/tabletop/logic/gameValidator.ts`: Schema validation and mode sanitization.
- `src/games/tabletop/logic/__tests__/pcioParser.test.ts`: Vitest test suite.

## Step-by-Step Implementation Instructions

1. **Define Domain Types (`src/games/tabletop/logic/types.ts`)**:
   ```typescript
   export type TabletopPlayMode = 'party_multi_device' | 'local_pass_and_play' | 'solo';
   export type WidgetType = 'card' | 'deck' | 'holder' | 'token' | 'die' | 'spinner' | 'counter' | 'label';

   export interface BaseWidget {
     id: string;
     type: WidgetType;
     x: number;
     y: number;
     width: number;
     height: number;
     zIndex: number;
     ownerSeat?: number; // If set (e.g. 0, 1, 2), private to this player seat
     pinned?: boolean;
     label?: string;
   }

   export interface CardWidget extends BaseWidget {
     type: 'card';
     deckId?: string;
     frontContent: { type: 'image' | 'text'; value: string; color?: string };
     backContent: { type: 'image' | 'text'; value: string; color?: string };
     faceUp: boolean;
     rotation: number;
   }

   export interface DeckWidget extends BaseWidget {
     type: 'deck';
     cardIds: string[];
     backContent: { type: 'image' | 'text'; value: string; color?: string };
   }

   export interface HolderWidget extends BaseWidget {
     type: 'holder';
     dropTargetTypes: WidgetType[];
     childIds: string[];
     layout: 'stack' | 'fan' | 'grid';
     isHand?: boolean; // True for player hands
     dropTarget?: boolean; // True if public discard/play zone
   }

   export interface TokenWidget extends BaseWidget {
     type: 'token';
     color: string;
     shape: 'circle' | 'square' | 'meeple';
   }

   export interface CounterWidget extends BaseWidget {
     type: 'counter';
     value: number;
     step: number;
     min?: number;
     max?: number;
   }

   export interface DieWidget extends BaseWidget {
     type: 'die';
     currentValue: number;
     sides: number;
     rolling?: boolean;
   }

   export type TabletopWidget = CardWidget | DeckWidget | HolderWidget | TokenWidget | CounterWidget | DieWidget;

   export interface TabletopGameDefinition {
     id: string;
     name: string;
     description?: string;
     author?: string;
     version: string;
     minPlayers: number;
     maxPlayers: number;
     supportedModes: TabletopPlayMode[];
     table: {
       width: number;
       height: number;
       backgroundColor?: string;
       backgroundImageUrl?: string;
       gridSnap?: number;
     };
     widgets: Record<string, TabletopWidget>;
     assetFiles?: Record<string, string>; // Blob/base64 data URLs for custom card/board art
   }
   ```

2. **Implement Parser (`src/games/tabletop/logic/pcioParser.ts`)**:
   - Ingest JSON string or ZIP ArrayBuffer.
   - Detect PlayingCards.io structure (`manifest.json` / `state.json`):
     - Extract widgets and map `cardDeck` -> `DeckWidget`, `cardHand` -> `HolderWidget (isHand: true)`.
     - Assign default `supportedModes`: If hand widgets exist, enable `party_multi_device`; if 1-2 players or no secret hands, also enable `local_pass_and_play`.
   - Provide safe fallback bounding boxes and coordinates.

3. **Validation & Unit Tests (`__tests__/pcioParser.test.ts`)**:
   - Test JSON normalization, ZIP decompression, missing field defaults, and play mode detection.

## Verification & Quality Gates
```bash
npm run lint
npm test -- src/games/tabletop/logic
npm run build
```
