---
type: Reference
title: 'Core data models — where the real types live'
description: 'Map of the TypeScript types that define the registry, players, sync envelopes, songs, tabletop games, Werewolf, GuessArt, Storyteller, Gartic Phone, Imposter and push payloads, with short excerpts copied from the code. The code is authoritative; this page only tells you which file to open.'
tags: [types, data-models, typescript]
status: stable
generated:
  at: 2026-10-18T15:00:00+02:00
  by: claude-code
verified:
  at: 2026-10-18
  method: 'excerpts copied from the listed files; export lists via grep'
sources:
  - 'src/lib/gameRegistry.tsx'
  - 'src/modules/player-management/types.ts'
  - 'src/modules/sync/MqttMailboxService.ts'
  - 'src/games/*/types.ts, src/games/*/logic/types.ts'
---

# Core data models

Do **not** copy types from here into code — import them from the source file. Excerpts may lag behind; re-open the file before relying on a field.

## 1. Where to look

| Domain                    | File                                      | Main exports                                                                                                             |
| ------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Game registry             | `src/lib/gameRegistry.tsx`                | `GameCategory`, `GameDefinition`, `GameRouteDefinition`                                                                  |
| Player lobby              | `src/modules/player-management/types.ts`  | `LobbyPlayerItem`, `UseLobbyPlayersOptions`, `UseLobbyPlayersResult`, `PlayerManagerCardProps`                           |
| MQTT sync                 | `src/modules/sync/MqttMailboxService.ts`  | `MqttEnvelope<T>`, `MqttMailboxOptions`, `MessageListener<T>`                                                            |
| Multi-channel sync        | `src/modules/sync/useMultiChannelSync.ts` | `UseMultiChannelSyncOptions<T>`, `UseMultiChannelSyncReturn<T>`                                                          |
| Melodiq song parsing      | `src/games/melodiq/parser.ts`             | `Note`, `SongTrack`, `ParsedSong`                                                                                        |
| Melodiq library / DB      | `src/games/melodiq/db.ts`                 | `Song`, `SongMeta`, `Score`, `Playlist`, `StoredDirectoryHandle`                                                         |
| Melodiq runtime / network | `src/games/melodiq/types.ts`              | `UserProfile`, `ActivePlayer`, `PassiveGameState`, `MelodiqParticipant`, `MelodiqNetworkMessage`, Presentation API shims |
| Tabletop                  | `src/games/tabletop/logic/types.ts`       | `WidgetType`, `TabletopWidget` (union of `CardWidget`, `DeckWidget`, …), `TabletopGameDefinition`, `HiddenZone`          |
| Werewolf                  | `src/games/werewolf/logic/types.ts`       | `RoleDefinition`, `Role`, `Player`, `NightAction`, `GamePhase`, `GameState`                                              |
| GuessArt                  | `src/games/guessart/logic/types.ts`       | `GuessArtGameRecord`, `GuessArtRound`, `GameSnapshot`, `CategoryItem`, `WordItem`, `MasterCatalogue`                     |
| Storyteller               | `src/games/storyteller/types.ts`          | `StoryGameRecord`, `StoryEntry`, `StoryModifierSettings`, `StoryGameSnapshot`                                            |
| Gartic Phone              | `src/games/garticphone/types.ts`          | `GarticPhase`, `GarticGameState`, `GarticAction`, `GarticBook`                                                           |
| Imposter                  | `src/games/imposter/logic/types.ts`       | `GamePhase`, `Player`, `Category`, `WordPair`, `GameState`                                                               |
| Push                      | `src/lib/push/pushTypes.ts`               | `NotificationMethod`, `PushNotificationPayload`, `NotifyPushRequest`, …                                                  |
| Server config             | `server/src/core/types.ts`                | `ServerConfigData`, `ApiKey`, `GalaxyPlugin`, `ServerConfig`                                                             |

## 2. Excerpts

### Game registry

```typescript
// src/lib/gameRegistry.tsx
export type GameCategory =
  'all' | 'dice' | 'drawing' | 'music' | 'social_deduction' | 'cards' | 'party' | 'puzzle';

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

### Sync envelope

```typescript
// src/modules/sync/MqttMailboxService.ts
export interface MqttEnvelope<T> {
  version: number;
  channelId: string;
  senderClientId: string;
  timestamp: number;
  payload: T;
}
```

GuessArt's payload type, for example, is `GameSnapshot { game: GuessArtGameRecord; round: GuessArtRound | null }`.

### UltraStar song

```typescript
// src/games/melodiq/parser.ts
export interface Note {
  type: string; // ':' normal, '*' golden, 'F' freestyle, 'R' rap, 'G' golden rap, '-' line break
  start: number; // beats after GAP
  duration: number; // beats
  pitch: number; // MIDI number (0 for line breaks)
  text: string; // syllable
}
export interface SongTrack {
  name: string;
  notes: Note[];
}
export interface ParsedSong {
  headers: Record<string, string>; // upper-cased #KEY: value
  notes: Note[]; // @deprecated → tracks[0].notes
  tracks: SongTrack[]; // duets have two
  bpm: number; // default 120
  gap: number; // ms, default 0
}
```

### Tabletop

```typescript
// src/games/tabletop/logic/types.ts
export type WidgetType = 'card' | 'deck' | 'holder' | 'token' | 'die' | 'counter' | 'seat' | 'bag';

export interface TabletopGameDefinition extends TabletopGameMetadata {
  version: string;
  minPlayers: number;
  maxPlayers: number;
  supportedModes: TabletopPlayMode[];
  table: TabletopTableConfig;
  widgets: Record<string, TabletopWidget>;
  assetFiles?: Record<string, string>;
  updatedAt?: number;
  ruleText?: string;
  hiddenZones?: Record<string, HiddenZone>;
}
```

### Werewolf

```typescript
// src/games/werewolf/logic/types.ts
export type RoleAlignment = 'VILLAGER' | 'WEREWOLF' | 'NEUTRAL';
export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  alignment: RoleAlignment;
  abilities: Ability[];
  isCustom?: boolean;
  narratorText?: string;
  inheritsFrom?: string;
}
export interface Player {
  id: PlayerId;
  name: string;
  role: Role | null;
  isAlive: boolean;
  needsToAct: boolean;
  powerState: PlayerPowerState;
}
```

### Player lobby

```typescript
// src/modules/player-management/types.ts
export interface LobbyPlayerItem {
  name: string;
  isRemote?: boolean;
}
```
