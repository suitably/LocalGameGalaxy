# Imposter Game Module [ID: TECH-IMPOSTER]

> [!NOTE]
> This document covers the Imposter game module. For Melodiq see [melodiq-architecture.md](file:///home/deck/Projects/LocalGameGalaxy/docs/tech/melodiq-architecture.md) and for Werewolf see [werewolf-architecture.md](file:///home/deck/Projects/LocalGameGalaxy/docs/tech/werewolf-architecture.md).

---

## 1. Game Overview

**Imposter** is a local, pass-the-device social deduction game. One or more players receive a secret word, while the remaining players (the "Imposters") receive a related but different word. Players take turns describing their word without saying it, then vote on who they think the Imposter is.

---

## 2. Game Phase State Machine

```
LOBBY → HANDOVER → TIMER → VOTING → RESULT → LOBBY (replay)
```

| Phase | Description |
|-------|-------------|
| `LOBBY` | Player setup, category selection, imposter count, timer config |
| `HANDOVER` | Pass-device flow — each player privately sees their secret word |
| `TIMER` | Live countdown, players describe their words simultaneously |
| `VOTING` | Players vote on who the Imposter is |
| `RESULT` | Winner announced (IMPOSTERS or NORMAL players) |

---

## 3. Component Hierarchy

```
ImposterGame.tsx               ← Root; manages GameState, database seeding, localStorage
├── GameSetup.tsx              ← LOBBY phase: player list, category picker, settings
├── HandoverView.tsx           ← HANDOVER phase: pass-device word reveal per player
├── GameTimer.tsx              ← TIMER phase: countdown display, pause/resume
├── VotingView.tsx             ← VOTING phase: tap-to-vote player elimination UI
└── GameInfoDialog.tsx         ← Rules explanation dialog (auto-opens on first visit)
```

---

## 4. State Management

All game state is managed locally in `ImposterGame.tsx` via `useState`. There is no external context or reducer — state is passed as props to child components.

```typescript
interface GameState {
  phase: 'LOBBY' | 'HANDOVER' | 'TIMER' | 'VOTING' | 'RESULT';
  players: Player[];
  selectedCategories: DbCategory[];
  selectedWord: string | null;     // The secret word for non-imposters
  selectedHint: string | null;     // The imposter's related-but-different hint word
  imposterCount: number;           // How many imposters in this round
  timerLength: number;             // Countdown timer in seconds
  remainingTime: number;
  isPaused: boolean;
  currentPlayerIndex: number;      // Which player is currently viewing their word (HANDOVER)
  winner: 'IMPOSTERS' | 'NORMAL' | null;
}
```

---

## 5. Word Database & Category Seeding

Imposter uses the `LocalGameGalaxyDB` Dexie database with two tables:
- `wordCategories` — category definitions (ID + `{ en, de }` name)
- `wordPairs` — word pair entries (`{ words: { en: [word, hint], de: [word, hint] }, categoryIds }`)

The seeder (`logic/dbSeeder.ts`) runs on every mount of `ImposterGame.tsx` via `useEffect`:
1. Checks if the database is empty (`db.wordCategories.count() === 0`).
2. If empty, bulk-inserts from `wordPairCategories.ts` (category list) and `wordPairs_en.ts` / `wordPairs_de.ts` (word pair lists).
3. Word pairs are bilingual: the active language (`i18n.language`) determines which word variant is displayed.

> [!WARNING]
> There is a known race condition where the database may not be seeded by the time the first category query runs. See issue #45.

---

## 6. localStorage Keys

| Key | Purpose |
|-----|---------|
| `imposter-setup-players` | Persists the player list between sessions |
| `imposter-has-seen-info` | Tracks whether the rules dialog has been shown (to auto-open on first visit) |

---

## 7. Win Conditions

- **NORMAL players win**: They correctly identify and vote out all Imposters before the timer ends.
- **IMPOSTERS win**: They survive the vote without being fully eliminated.
