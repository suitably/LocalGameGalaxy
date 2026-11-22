---
type: Game Architecture
title: Werewolf Game Module Architecture
description: Architecture of the Werewolf moderator engine, role state machines, night resolution order, and player setup.
resource: src/games/werewolf/
tags: [werewolf, social-deduction, state-machine, roles]
status: stable
generated:
  at: 2026-09-27T10:00:00Z
  by: previous-agent
verified:
  at: 2026-11-22
  method: '2026-11-16: component tree in section 2 re-checked against src/games/werewolf/components with ls and grep; other sections not re-verified since the 2026-10-18 audit; 2026-11-22: section 6a written from the party-room code'
---

# Werewolf Game Module Architecture

> [!NOTE]
> This document covers the Werewolf game module architecture. For Melodiq, see [melodiq-architecture.md](melodiq-architecture.md).

---

## 1. Module Overview

Werewolf is the primary game module and the oldest feature in LocalGameGalaxy. It is a fully offline, moderator-assisted social deduction game. The app serves as a **digital game master** — managing roles, narrating night phases via Text-to-Speech (TTS), and tracking win conditions automatically.

**Entry Point**: `src/games/werewolf/WerewolfGame.tsx`

---

## 2. Component Hierarchy

```
WerewolfGame.tsx              ← Root; wraps WerewolfGameProvider (context/WerewolfGameContext.tsx)
└── components/
    ├── ContinueGameDialog.tsx    ← Resume or discard a saved game
    ├── GameSetup.tsx             ← Player management, role selection (setup/RoleSelectionGrid, setup/RoleDescriptionDialog)
    │   └── RoleEditor.tsx        ← Role customization list (RoleEditDialog.tsx, editor/AbilityEditor.tsx)
    ├── RoleReveal.tsx            ← Pass-device individual role reveal flow
    ├── NightPhase.tsx            ← Night phase UI; triggers TTS narrator (hooks/useTTS.ts)
    │   ├── night/StandardRoleNight.tsx  ← Built-in role actions (roles/*View.tsx per role)
    │   ├── night/CustomRoleNight.tsx    ← Ability-driven custom roles
    │   └── night/RoleInfoDialog.tsx
    ├── DayPhase.tsx              ← Day discussion phase
    ├── VotingPhase.tsx           ← Player voting / elimination
    ├── HunterShotView.tsx        ← Hunter post-elimination action
    └── GameOver.tsx              ← Win condition display and restart
```

---

## 3. State Management

All game state is managed by a single **Redux-pattern reducer** in `src/games/werewolf/logic/gameReducer.ts`, exposed via React Context.

### 3.1 GameState Shape

```typescript
interface GameState {
  players: Player[]; // All players with roles and alive status
  phase: GamePhase; // Current game phase
  round: number; // Current round counter
  nightDecisions: NightDecision[]; // Collected night actions (resolved at dawn)
  nightActionLog: string[]; // Human-readable log for moderator
  winner: WinnerFaction | null; // Set when win condition is met
  enabledRoles: Role[]; // Roles active in this game
  customRoles: RoleDefinition[]; // User-defined custom roles
  pendingHunterIds: string[]; // Hunters awaiting their shot
  nextPhaseAfterShot: GamePhase | null;
}
```

### 3.2 Game Phase Flow

```mermaid
stateDiagram-v2
    [*] --> SETUP
    SETUP --> ROLE_REVEAL : START_GAME
    ROLE_REVEAL --> NIGHT : NEXT_PHASE
    NIGHT --> DAY : NEXT_PHASE (resolves night actions)
    DAY --> VOTING : NEXT_PHASE
    VOTING --> NIGHT : NEXT_PHASE (if no winner)
    VOTING --> HUNTER_SHOT : (if Hunter is eliminated)
    HUNTER_SHOT --> NIGHT : (after shot)
    VOTING --> GAME_OVER : (win condition met)
    NIGHT --> GAME_OVER : (win condition met during night)
```

### 3.3 Night Action Resolution

Night actions are **collected during the NIGHT phase** and **resolved atomically** when `NEXT_PHASE` is dispatched to move to DAY. The resolution order is:

1. Guardian / Survivor protection is applied first.
2. Werewolf KILL is applied (blocked if target is protected).
3. Witch HEAL overrides a kill. Witch KILL is applied.
4. Black Werewolf INFECT is applied.
5. Pyromaniac BURN is applied to all oiled targets.
6. Death cascade: Lovers die together, Hunter triggers `HUNTER_SHOT` phase.
7. Win conditions are evaluated after all deaths are resolved.

---

## 4. Win Condition Logic (`utils.ts`)

`getWinningFaction()` evaluates after every player death:

| Faction            | Win Condition                                  |
| ------------------ | ---------------------------------------------- |
| **Villagers**      | All Werewolves (and Black Werewolf) are dead   |
| **Werewolves**     | Werewolves ≥ Villagers (by count)              |
| **White Werewolf** | Only the White Werewolf remains alive          |
| **Lovers**         | Only the Cupid-linked lover pair remains alive |
| **Angel**          | Angel is eliminated on Round 1 Day vote        |
| **Ripper**         | Ripper is the last player alive                |
| **Survivor**       | Survivor is alive when any other faction wins  |
| **Pyromaniac**     | All non-Pyromaniac players are burned          |
| **Easter Bunny**   | Easter Bunny gave an egg to every alive player |

---

## 5. Custom Role System

Custom roles are defined using the `RoleDefinition` interface:

```typescript
interface RoleDefinition {
  id: string; // Unique ID (UUID for custom roles)
  name: string; // Display name
  alignment: 'VILLAGER' | 'WEREWOLF' | 'NEUTRAL';
  abilities: Ability[]; // Night action definitions
  inheritsFrom?: string; // Base role ID to inherit behavior from
  isCustom: boolean;
}
```

Custom roles are persisted via `storage` (`STORAGE_KEYS.WEREWOLF_CUSTOM_ROLES` = `werewolf-custom-roles`) and merged into `GameState.customRoles` on game start.

---

## 6. Text-to-Speech (TTS) Integration

The `useTTS` hook in `src/games/werewolf/hooks/` provides narrator voice during the night phase. It:

- Uses the Web Speech API (`window.speechSynthesis`).
- Reads `narratorText` from each role's `RoleDefinition`.
- Queues speech utterances to play sequentially as each role's turn begins.
- Respects user settings (enable/disable TTS, voice selection).

---

## 6a. Party room (roles on own phones)

`WerewolfEntry.tsx` opens `WerewolfRoomGame.tsx` when the URL carries `?room=` (party picker, `launch=werewolf`), else the pass-and-play game.

- **Sync:** `useWerewolfRoom` → `useSealedPartyGame` → `SealedRoomPeer` (`src/modules/room-game/sealed/`, channel `werewolf-sealed_<room>`). The host keeps the only state; each device receives only its own view (`logic/werewolfRoomView.ts`): its role, its pack (wolves), its lover, its seer findings, and during its night turn the table without roles (the witch also sees the wolves' victim). Game over reveals every role.
- **Rules:** `logic/werewolfRoom.ts` wraps `GameState` and delegates to `gameReducer` (`START_GAME`, `NIGHT_ACTION`, `NEXT_PHASE`, `KILL_PLAYER`, `HUNTER_SHOT`). The room layer adds: role-card confirmation (`SEEN`; the last one starts night 1), the night order (`getNightRolesToAct` filtered to roles with phone turns) with one step per called role (`NIGHT_ACTION` / `NIGHT_SKIP`, only from that role's living players; any wolf decides for the pack), votes on every living phone (most votes → `KILL_PLAYER`, a tie kills nobody), the hunter shooting from their own phone, a win check at dawn, and spending the witch's poison (the engine does not).
- **Roles:** `ROOM_ROLES` = villager, werewolf, seer, witch, hunter, cupid, guardian, little girl, wise, angel. Other roles and custom roles stay pass-and-play only (their views read roles from the table or need more than one turn per night).
- **Narrator:** the host device speaks (`useTTS`): nightfall, each called role, the morning with the deaths, the vote, the hunter. With "this device only narrates" the host gets no role and shows the table (a TV or game master).
- **Setup:** `components/room/RoomSetup.tsx` reuses `useWerewolfSetup` (with `allowedRoles`), `RoleSelectionGrid` (`only`) and `WerewolfCountStepper`; the settings are shared with pass-and-play (`WEREWOLF_SETTINGS`).

---

## 7. Development Rules for Werewolf

1. **All game logic goes in `logic/`**: Reducers, win conditions, and utility functions must be pure functions with no React or DOM dependencies — fully testable in isolation.
2. **Night actions are declarative**: Each role submits a `NightDecision` object; resolution logic is centralized in `gameReducer.ts`, not in individual role components.
3. **Custom roles inherit, not override**: New custom roles should declare `inheritsFrom` to reuse base role resolution logic and only override what's different.
