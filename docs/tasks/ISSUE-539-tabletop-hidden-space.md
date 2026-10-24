---
type: Task
title: 'Tabletop hidden space: move, resize, visibility toggle (#539)'
description: 'Owner moves and resizes their hidden zone in edit mode like a widget (contained unlocked widgets move along) and toggles its visibility with an in-zone button; also the worked example for the multi-agent token workflow.'
tags: [tabletop, hidden-zone, editor, task, agents]
status: draft
generated:
  at: 2026-10-24T18:00:00+02:00
  by: claude-code
verified:
  at: 2026-10-24
  method: 'Scout brief (haiku) on src/games/tabletop; spot-checked hiddenZoneLogic.ts exports, TOGGLE_ZONE_REVEAL dispatch, isWidgetHiddenForViewer callers with grep.'
sources:
  - 'https://github.com/suitably/LocalGameGalaxy/issues/539'
  - 'src/games/tabletop/logic/hiddenZoneLogic.ts'
  - 'src/games/tabletop/logic/reducers/viewReducer.ts'
  - 'src/games/tabletop/components/surface/HiddenZoneLayer.tsx'
  - 'src/games/tabletop/components/surface/TabletopSurface.tsx'
---

# Tabletop hidden space (#539)

Workflow: [multi-agent token strategy](../workflows/multi-agent-token-strategy.md). This file is the shared memory for all agents on this task — prompts point here instead of repeating context.

## 1. Request

- Hidden zone is created in the middle of the table. Its owner can move and resize it in edit mode like other elements ("unify").
- Moving the zone moves the widgets inside it, except locked ones.
- A button inside the zone toggles visibility and shows the current state: everyone sees it, or only the owner (and spectators).

## 2. Facts (scout brief, 2026-10-24)

| Fact                                                                                                                               | Where                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `createDefaultHiddenZone` centers the zone — the "middle of the table"                                                             | `logic/hiddenZoneLogic.ts:71`                                            |
| `UPDATE_HIDDEN_ZONE` takes `Partial<HiddenZone>` but has no UI dispatcher and no test                                              | `logic/reducers/viewReducer.ts:98`                                       |
| `TOGGLE_ZONE_REVEAL` flips the global `revealed` flag; only reachable through a context menu                                       | `viewReducer.ts:129`, `components/surface/HiddenZoneLayer.tsx:133`       |
| `isWidgetInsideZone` (center-point test) exists; `findZonesContainingWidget` and `isWidgetHiddenForViewer` have no non-test caller | `hiddenZoneLogic.ts:9,26,44`                                             |
| Widget move = `MOVE_WIDGET` (single widget); resize/rotate = `SelectionHandles` → `PATCH_WIDGETS`                                  | `logic/tabletopReducer.ts:115`, `components/editor/SelectionHandles.tsx` |
| "Locked" widget = `pinned` or `movable === false` (drag pans instead)                                                              | `logic/types.ts:73,85`, `hooks/useTabletopEngine.ts:96`                  |
| Sync and undo are generic game diffs, so zone actions already sync and are undoable in edit mode                                   | `logic/syncProtocol.ts:45`, `components/editor/useTabletopEditor.ts:36`  |
| `TabletopSurface.tsx` is 247 / 250 lines — no new handler fits there                                                               | `check:budget`                                                           |

## 3. Decisions (maintainer, 2026-10-24)

1. **Visibility model:** keep the `revealed` boolean (`false` = owner only, `true` = everyone), shown as an in-zone eye toggle with a state label. Spectators are out of scope.
2. **Fog of war:** fix in this issue — widgets inside a non-revealed zone are obscured for every viewer except the zone owner, via the existing `isWidgetHiddenForViewer` (slice 4).
3. **Locked:** a widget is locked when `pinned || movable === false`; locked widgets stay in place when their zone moves.

## 4. Slices

Each slice = one `slice-implementer` run; prompt: "Implement slice N of `docs/tasks/ISSUE-539-tabletop-hidden-space.md`. Touch only the listed files."

### Slice 1 — logic (sequential, first)

- `logic/hiddenZoneLogic.ts`: `moveZoneWithContents(game, zoneId, dx, dy)` → zone patch + widget moves for contained, unlocked widgets; `resizeZone` clamps to a minimum size and table bounds.
- `logic/reducers/viewReducer.ts`: `MOVE_HIDDEN_ZONE` (zone + contents in one reducer step, so undo is one step) or extend `UPDATE_HIDDEN_ZONE`; owner check stays in UI.
- Tests: `logic/__tests__/hiddenZoneLogic.test.ts`, `logic/__tests__/tabletopReducer.test.ts` (move with contents, locked widget stays, resize clamp, `UPDATE_HIDDEN_ZONE`).

### Slice 2 — state hook (after slice 1)

- New `components/surface/useHiddenZoneEditing.ts`: pointer drag/resize state for zones in edit mode, dispatches slice-1 actions on pointer-up, owner-only (`ownerSeat` vs `currentSeatId`).
- Reuse the pointer pattern of `SelectionHandles.tsx`; do not widen `WidgetPatch`.

### Slice 3 — UI (after slice 2)

- `components/surface/HiddenZoneLayer.tsx`: drag area + resize handles in edit mode, eye button with state label inside the zone (replaces nothing; context menu stays).
- `TabletopSurface.tsx` may only change the props it passes (0 net lines).
- Strings in `public/locales/{de,en}/translation.json` (tabletop keeps its strings there — confirm with `grep -n "tabletop" public/locales/en/translation.json | head`).

### Slice 4 — fog of war (after slice 1; parallel to slices 2–3 only if files are disjoint)

- Wire `isWidgetHiddenForViewer` (`logic/hiddenZoneLogic.ts:44`) into widget rendering: for a viewer who is not the zone owner, a widget inside a non-revealed zone renders as an opaque placeholder (no face, label or value; no interaction beyond what the owner allows). Viewer seat = the local `currentSeatId` mapped to a seat index the same way `ownerSeat` is set.
- Prefer a small pure helper (e.g. `getHiddenWidgetIds(game, viewerSeatIndex)` in `hiddenZoneLogic.ts`) plus a memo in an existing hook; keep `TabletopSurface.tsx` at net 0 lines (move code out if needed).
- Tests: helper in `logic/__tests__/hiddenZoneLogic.test.ts` (owner sees, other seat obscured, revealed shows all, `showAlways` shows).

### Close (orchestrator)

- gate-runner once; `docs/tech/tabletop-engine.md` (viewReducer row, new action), `docs/log.md`, CHANGELOG.

## 5. Acceptance criteria

- [ ] In edit mode the owner drags and resizes their zone; other seats cannot.
- [ ] Moving a zone moves contained widgets except pinned / `movable: false`; one undo step reverts both.
- [ ] In-zone button toggles visibility and shows the current state, in `de` and `en`.
- [ ] Changes sync to other devices (host-authoritative intent).
- [ ] Other seats see widgets inside a non-revealed zone only as placeholders; the owner sees them; revealing shows them to everyone.
- [ ] All gates pass; `TabletopSurface.tsx` stays ≤ 250 lines.

## 6. Token plan (example for the workflow)

| Phase            | Agent             | Model   | Main-context cost                          |
| ---------------- | ----------------- | ------- | ------------------------------------------ |
| Triage           | orchestrator      | session | issue + 3 greps                            |
| Map area         | scout             | haiku   | 40-line brief instead of ~1,500 read lines |
| Spec + decisions | orchestrator      | session | this file                                  |
| Slices 1–3       | slice-implementer | sonnet  | 3 × ≤ 15-line report                       |
| Review           | orchestrator      | session | `git diff --stat` + logic diff             |
| Gates            | gate-runner       | haiku   | ≤ 20 lines                                 |

Before the session ends: `npm run tokens` and paste the table into the PR description ([workflow §7](../workflows/multi-agent-token-strategy.md#7-measuring)).

## 7. Progress

- [x] scout
- [x] decisions (§3)
- [x] slice 1 — logic
- [ ] slice 2 — state hook
- [ ] slice 3 — UI
- [ ] slice 4 — fog of war
- [ ] gates
- [ ] docs
- [ ] PR
