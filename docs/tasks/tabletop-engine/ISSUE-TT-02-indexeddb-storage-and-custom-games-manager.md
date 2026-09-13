---
title: "[Feature][Tabletop] IndexedDB Storage, Manager, Edit & Export Pipelines"
labels: ["tabletop", "storage", "editor", "export", "feature", "priority:high"]
assignees: []
---

## Summary
Implement offline-first persistent storage for custom and imported tabletop games using IndexedDB (`dexie`), alongside a comprehensive management UI. Every game item must feature a clean action bar: **Play** (with mode selector: Party vs. Local), **Edit** (metadata, supported play modes, cards/decks), **Export** (download as `.pcio` or `.json`), **Publish** (GitHub PR), and **Delete** (with `<ConfirmDialog>`).

## Architectural Context & Guidelines
- **Anti-God-Component Architecture (Section 3.1 in AGENTS.md)**:
  - Max **250 lines** per `.tsx` component.
  - Split into `GameManagerDialog.tsx` (orchestrator), `GameCardItem.tsx`, `EditGameDialog.tsx`, and `GameDropZone.tsx`.
- **Dialogs & Storage Rules**:
  - Always use `<ConfirmDialog>` from `src/components/common/ConfirmDialog.tsx` (never `window.confirm`).
  - Use `src/lib/storage.ts` for simple settings, IndexedDB for game files.
- **Exporting**:
  - Generate clean downloadable files using `Blob` and standard anchor trigger.

## Dependencies & Preconditions
- **Depends on:** `ISSUE-TT-01` (`types.ts` and `pcioParser.ts`)

## File Paths to Create
- `src/games/tabletop/logic/tabletopStorage.ts`: IndexedDB operations (`saveGame`, `getGame`, `listGames`, `deleteGame`).
- `src/games/tabletop/logic/tabletopExporter.ts`: Export utility (`exportAsJson`, `exportAsPcio`).
- `src/games/tabletop/hooks/useTabletopGames.ts`: Custom hook for games list, import, edit, export, and delete actions.
- `src/games/tabletop/components/manager/GameManagerDialog.tsx`: Dialog listing installed games and import actions.
- `src/games/tabletop/components/manager/GameCardItem.tsx`: Card for a single game with the unified Action Bar.
- `src/games/tabletop/components/manager/EditGameDialog.tsx`: Dialog for editing title, description, supported modes, and cards.
- `src/games/tabletop/components/manager/GameDropZone.tsx`: Drag & drop file area for `.pcio` and `.json`.

## Step-by-Step Implementation Instructions

1. **Storage Operations (`tabletopStorage.ts`)**:
   - Create IndexedDB database `galaxy_tabletop_db` with table `custom_games`.
   - Store full `TabletopGameDefinition` indexed by `id`, `name`, `updatedAt`.
   - Provide summary helper `listTabletopGames(): Promise<TabletopGameSummary[]>`.

2. **File Exporter (`tabletopExporter.ts`)**:
   ```typescript
   export function exportGameAsJson(game: TabletopGameDefinition): void {
     const blob = new Blob([JSON.stringify(game, null, 2)], { type: 'application/json' });
     downloadBlob(blob, `${slugify(game.name)}.json`);
   }

   export async function exportGameAsPcio(game: TabletopGameDefinition): Promise<void> {
     // Package template.json + assets into ZIP blob via fflate
     const zipBlob = await createPcioZip(game);
     downloadBlob(zipBlob, `${slugify(game.name)}.pcio`);
   }
   ```

3. **Game Editor Dialog (`EditGameDialog.tsx`)**:
   - Form fields:
     - Name & Description.
     - Min / Max Players.
     - Mode toggles (Checkboxes: *Party Multi-Device*, *Local Pass-and-Play*, *Solo*).
   - Card/Deck summary with options to add/remove cards or adjust card values.
   - Saves updated definition back to IndexedDB.

4. **Unified Action Bar on `GameCardItem.tsx`**:
   - **Play Button**:
     - If both `party_multi_device` and `local_pass_and_play` are supported: Render split button / dropdown (*„Im Party-Modus starten“* vs. *„Lokal an diesem Gerät“*).
     - If only 1 mode: Single primary button.
   - **Edit Button (`✏️`)**: Opens `EditGameDialog`.
   - **Export Button (`💾`)**: Triggers `exportGameAsPcio` / `exportGameAsJson`.
   - **Publish Button (`🚀`)**: Opens `PublishTabletopGameDialog` (from `ISSUE-TT-07`).
   - **Delete Button (`🗑️`)**: Triggers `<ConfirmDialog>` before deletion.

## Verification & Quality Gates
```bash
npm run check:architecture:diff
npm run check:budget
npm run lint
npm test -- src/games/tabletop
npm run build
```
