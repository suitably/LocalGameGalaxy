---
type: Reference
title: 'Game catalog — every game with route, folder, storage, sync, i18n and tests'
description: 'One table per concern for all 15 hub entries (14 game folders registered in gameRegistry.tsx plus the Party lobby, and Gartic Phone which is only reachable through the Party lobby): route, category, size, persistence, sync channel, translation source, shared modules used, test files.'
tags: [games, registry, catalog, storage, sync, i18n, tests]
status: stable
generated:
  at: 2026-10-18T15:00:00+02:00
  by: claude-code
verified:
  at: 2026-10-18
  method: 'derived from code on branch docs/okf-knowledge-base (base consolidated/quality-sprint-october @ c298e79): gameRegistry.tsx, grep of imports, STORAGE_KEYS usage, Dexie/IndexedDB names, *.test.* files'
sources:
  - 'src/lib/gameRegistry.tsx'
  - 'src/games/*/'
  - 'src/lib/storage.ts'
---

# Game catalog

Games live in `src/games/<id>/` and are registered by hand in [`src/lib/gameRegistry.tsx`](../../src/lib/gameRegistry.tsx) (lazy-loaded entry component, route, category, colours, i18n title/description keys). The hub renders the registry; there is **no auto-discovery** (see [open-questions Q7](../open-questions.md#q7--scaffolder-generates-a-gamemanifestts-pattern-no-game-uses)).

Numbers below are a snapshot (2026-10-18). Re-derive them before relying on them — commands at the end.

## 1. Registry and size

Registry order = hub order.

| id              | Route                              | Category         | Folder                                   | LOC (non-test) | Test files |
| --------------- | ---------------------------------- | ---------------- | ---------------------------------------- | -------------- | ---------- |
| `darts`         | `games/darts`                      | party            | `src/games/darts`                        | 824            | 0          |
| `qwixx`         | `games/qwixx`                      | dice             | `src/games/qwixx`                        | 3 936          | 1          |
| `knister`       | `games/knister`                    | dice             | `src/games/knister`                      | 1 876          | 2          |
| `kniffel`       | `games/kniffel`                    | dice             | `src/games/kniffel`                      | 1 134          | 0          |
| `guessart`      | `games/guessart`                   | drawing          | `src/games/guessart`                     | 8 144          | 5          |
| `storyteller`   | `games/storyteller`                | party            | `src/games/storyteller`                  | 2 972          | 3          |
| `cards`         | `games/cards`                      | cards            | `src/games/cards`                        | 2 045          | 1          |
| `melodiq`       | `games/melodiq`                    | music            | `src/games/melodiq`                      | 18 585         | 9          |
| `melodiq-notes` | `games/melodiq-notes`              | music            | `src/games/melodiq-notes`                | 6 530          | 3          |
| `werewolf`      | `games/werewolf`                   | social_deduction | `src/games/werewolf`                     | 4 166          | 2          |
| `imposter`      | `games/imposter`                   | social_deduction | `src/games/imposter`                     | 1 594          | 0          |
| `party`         | `party`                            | party            | `src/features/party` (not a game folder) | —              | 1          |
| `wordle`        | `games/wordle`                     | puzzle           | `src/games/wordle`                       | 1 786          | 2          |
| `sudoku`        | `games/sudoku`                     | puzzle           | `src/games/sudoku`                       | 1 305          | 1          |
| `tabletop`      | `games/tabletop`                   | cards            | `src/games/tabletop`                     | 11 463         | 12         |
| _(garticphone)_ | launched from the Party lobby only | —                | `src/games/garticphone`                  | 1 839          | 1          |

Melodiq also registers standalone routes (`MelodiqQueue`, `MelodiqTV`) via `standaloneRoutes`. **Unverified:** whether PR #387 (tests for Kniffel, Darts, Imposter) has landed when you read this.

## 2. Persistence

All games use [`src/lib/storage.ts`](../../src/lib/storage.ts) for key/value state; details in [persistence.md](persistence.md).

| Game          | IndexedDB                                                               | Key/value keys                                                                                                                                                        |
| ------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| darts         | —                                                                       | `STORAGE_KEYS.DARTS_GAME_STATE`                                                                                                                                       |
| qwixx         | —                                                                       | local constants `qwixx_my_sheet`, `qwixx_show_dice` in `QwixxGame.tsx` (duplicates of registered `QWIXX_MY_SHEET` / `QWIXX_SHOW_DICE`)                                |
| knister       | —                                                                       | local constants `knister_current_game`, `knister_show_dice`, `knister_highscore`                                                                                      |
| kniffel       | —                                                                       | local constants `kniffel_current_game`, `kniffel_show_dice` (not in `STORAGE_KEYS`)                                                                                   |
| guessart      | `guessart-local` (raw IndexedDB via `modules/async-game`)               | local constants `guessart_seen_info`, `guessart_lobby_players_v2`, prefixes `guessart_game_alias_`, `guessart_local_players_`, `guessart_temp_local_players_`         |
| storyteller   | `storyteller-local` (raw IndexedDB via `modules/async-game`)            | local constants `storyteller_lobby_players`, `storyteller_lobby_modifiers`, prefix `storyteller_local_players_`                                                       |
| cards         | —                                                                       | literal `'cards_lobby_players'` passed as `storageKey` to `useLobbyPlayers` in `components/CardsLobby.tsx` (the registered `CARDS_LOBBY_PLAYERS` is never referenced) |
| melodiq       | `MelodiqDB` (Dexie)                                                     | ~45 `STORAGE_KEYS.MELODIQ_*` / `HELPER_*` keys                                                                                                                        |
| melodiq-notes | `MelodiqNotesDB` (Dexie)                                                | `MELODIQ_NOTES_*` (3 keys)                                                                                                                                            |
| werewolf      | —                                                                       | `WEREWOLF_*` (5 keys)                                                                                                                                                 |
| imposter      | `ImposterDB` (Dexie: categories, word pairs)                            | `IMPOSTER_*` (3 keys)                                                                                                                                                 |
| party         | —                                                                       | `PARTY_MY_PLAYER_ID`, `HOST_ROOM_CODE`, prefixes `PARTY_STATE`, `PARTY_HOST_ID`                                                                                       |
| wordle        | —                                                                       | `WORDLE_STATS`                                                                                                                                                        |
| sudoku        | —                                                                       | `SUDOKU_STATE`, `SUDOKU_STATS`                                                                                                                                        |
| tabletop      | `galaxy_tabletop_db` (raw IndexedDB, stores `custom_games`, `sessions`) | —                                                                                                                                                                     |
| garticphone   | —                                                                       | prefixes `GARTIC_STATE_PREFIX`, `GARTIC_HOST_PREFIX` (sessionStorage via `sessionStorageSafe`)                                                                        |

Game-local key constants bypass the `STORAGE_KEYS` registry rule — see [open-questions Q8](../open-questions.md#q8--game-local-storage-keys-bypass-the-storage_keys-registry).

## 3. Sync and multi-device

| Game        | Mechanism                                                                                       | Where                                                                                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| guessart    | `MqttMailboxService` (topic prefix `lgg/ga`)                                                    | `logic/guessArtMailbox.ts`                                                                                                                                 |
| storyteller | `useMultiChannelSync` + `MqttMailboxService` (`lgg/storyteller/v1`), Web Push / ntfy            | `StorytellerGame.tsx`, `logic/mailboxService.ts`                                                                                                           |
| tabletop    | `useMultiChannelSync` + `MqttMailboxService` (`lgg/tabletop`)                                   | `hooks/useTabletopSync.ts`                                                                                                                                 |
| party       | `MqttMailboxService` (`lgg/party`) + own `BroadcastChannel` `party_bc_<roomId>`                 | `src/features/party/logic/partyMailbox.ts`, `universalPartyManager.ts`                                                                                     |
| garticphone | `useMultiChannelSync` (via the party room)                                                      | `hooks/useGarticSync.ts`                                                                                                                                   |
| melodiq     | WebRTC (`src/lib/webrtc`) host ↔ phones, **plus direct `new BroadcastChannel`** for TV/tab sync | `hooks/useTVMode.ts`, `hooks/useTVReceiver.ts`, `hooks/SettingsContext.tsx`, `gameplay/hooks/useSessionEnd.ts` (`melodiq_tv_control`), `hooks/useQueue.ts` |
| all others  | single device, pass-and-play                                                                    | —                                                                                                                                                          |

Melodiq's direct `BroadcastChannel` use contradicts the "Inline BroadcastChannel Sync" rule — see [open-questions Q4](../open-questions.md#q4--melodiq-uses-inline-broadcastchannel). Protocol details: [sync-protocol.md](sync-protocol.md).

## 4. Translations

| Source                                                               | Games                                                                                                       |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Per-game bundle `src/games/<id>/i18n/index.ts` (`addResourceBundle`) | cards, kniffel, knister, melodiq, qwixx, sudoku, wordle                                                     |
| `public/locales/{de,en}/translation.json`                            | darts, guessart, storyteller, melodiq-notes, werewolf, imposter, tabletop, garticphone, party, hub/settings |

Details: [i18n-strategy.md](i18n-strategy.md).

## 5. Shared code used (resolved imports, non-test files)

| Game          | Shared imports                                                                                                                                                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| cards         | `components/Layout`, `context/TitleContext`, `hooks/useWakeLock`, `modules/player-management`                                                                                                                                                                                                                      |
| darts         | `components/common`, `context/LayoutContext`, `lib/storage`                                                                                                                                                                                                                                                        |
| garticphone   | **`features/party`**, `lib/disambiguateName`, `lib/storage`, `lib/uuid`, `modules/drawing`, `modules/sharing`, `modules/sync`                                                                                                                                                                                      |
| guessart      | `components/common`, `components/push`, `context/HeaderLayoutContext`, `context/TitleContext`, `hooks/useWakeLock`, `lib/github`, `lib/notifications`, `lib/push`, `lib/storage`, `lib/utils`, `lib/uuid`, `modules/async-game`, `modules/drawing`, `modules/player-management`, `modules/sharing`, `modules/sync` |
| imposter      | `context/TitleContext`, `hooks/useWakeLock`, `lib/storage`, `modules/player-management`                                                                                                                                                                                                                            |
| kniffel       | `components/Layout`, `components/common`, `components/games`, `context/TitleContext`, `lib/storage`, `lib/uuid`                                                                                                                                                                                                    |
| knister       | `components/Layout`, `components/games`, `context/TitleContext`, `hooks/useWakeLock`, `lib/storage`                                                                                                                                                                                                                |
| melodiq       | `components/ErrorBoundary`, `components/common`, `components/connection`, `context/LayoutContext`, `hooks/useScreenOrientation`, `hooks/useWakeLock`, `lib/github`, `lib/storage`, `lib/uuid`, `lib/webrtc`, `modules/audio`                                                                                       |
| melodiq-notes | `components/Layout`, `context/LayoutContext`, `lib/companion`, `lib/storage`, `modules/audio`, `modules/music-score`                                                                                                                                                                                               |
| qwixx         | `components/Layout`, `components/games`, `context/TitleContext`, `hooks/useWakeLock`, `lib/storage`, `lib/utils`, `lib/uuid`                                                                                                                                                                                       |
| storyteller   | `context/HeaderLayoutContext`, `context/TitleContext`, `hooks/useWakeLock`, `lib/notifications`, `lib/push`, `lib/storage`, `lib/utils`, `modules/async-game`, `modules/player-management`, `modules/sharing`, `modules/sync`                                                                                      |
| sudoku        | `components/Layout`, `context/TitleContext`, `lib/storage`, `lib/utils`                                                                                                                                                                                                                                            |
| tabletop      | `components/common`, `context/TitleContext`, **`features/party`**, `lib/github`, `lib/storage`, `lib/uuid`, `modules/async-game`, `modules/sync`                                                                                                                                                                   |
| werewolf      | `context/TitleContext`, `hooks/useWakeLock`, `lib/storage`, `lib/uuid`, `modules/player-management`                                                                                                                                                                                                                |
| wordle        | `components/Layout`, `context/TitleContext`, `lib/storage`, `modules/sharing`                                                                                                                                                                                                                                      |

No game imports another game (`npm run check:architecture` is clean). `garticphone` and `tabletop` import from `src/features/party`; that is allowed by the current rules but couples games to a feature folder (**Inference:** a candidate for moving the shared party contract into `src/modules/`).

## 6. Re-deriving this page

```sh
grep -n "id: '" src/lib/gameRegistry.tsx                       # registry order
find src/games/<id> -name '*.ts*' -not -name '*.test.*' | xargs cat | wc -l
find src/games/<id> -name '*.test.*' | wc -l
grep -rhoE "STORAGE_KEYS\.[A-Z_]+" src/games/<id> | sort -u
grep -rn -E "new Dexie\(|DB_NAME =|super\('" src/games
grep -rn "topicPrefix:" src
ls src/games/*/i18n
```
