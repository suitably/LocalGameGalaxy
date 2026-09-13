---
title: "[UI][A11y] Replace native window.confirm and window.prompt with MUI Dialog components"
labels: ["ui", "a11y", "react", "capacitor", "guessart", "melodiq", "priority:medium"]
assignees: []
---

## Summary
Per `AGENTS.md` (Section 4.5), modal confirmation must **always** use MUI `<Dialog>` or `<ConfirmDialog>`, and native `window.confirm()` or `window.prompt()` is strictly forbidden.
Native browser dialogs block the JS main thread, break on mobile webviews (Capacitor), have no styling, and fail accessibility standards.

## Problem Details & Exact Code Locations
1. [`src/games/guessart/components/catalogue/CatalogueEditorDialog.tsx:83`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/games/guessart/components/catalogue/CatalogueEditorDialog.tsx#L83):
   ```typescript
   if (!window.confirm(t('guessart.confirmResetCatalogue', '...'))) return;
   ```
2. [`src/games/guessart/components/catalogue/CategoryEditorTab.tsx:125`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/games/guessart/components/catalogue/CategoryEditorTab.tsx#L125):
   ```typescript
   if (!window.confirm(confirmMsg)) return;
   ```
3. [`src/games/guessart/components/catalogue/WordEditorTab.tsx:167`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/games/guessart/components/catalogue/WordEditorTab.tsx#L167):
   ```typescript
   if (!window.confirm(t('guessart.confirmDeleteWord', 'Wort wirklich löschen?'))) return;
   ```
4. [`src/games/melodiq/components/SongActionDialogs.tsx:370`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/games/melodiq/components/SongActionDialogs.tsx#L370):
   ```typescript
   const name = window.prompt(t('melodiq.playlist_name'));
   ```

## Dependencies & Preconditions
- **Dependencies:** None. Self-contained and immediately parallelizable.

## Step-by-Step Implementation Instructions
1. In GuessArt: Use the existing shared component `src/components/common/ConfirmDialog.tsx`.
   - In `CatalogueEditorDialog.tsx`:
     Introduce a boolean state `confirmResetOpen: boolean`. Trigger the action when confirmed.
   - In `CategoryEditorTab.tsx`:
     Introduce `deleteTargetId: string | null`. Open `<ConfirmDialog>` with the category name when set.
   - In `WordEditorTab.tsx`:
     Introduce `deleteTargetWord: WordItem | null`. Open `<ConfirmDialog>` when set.
2. In Melodiq (`SongActionDialogs.tsx`):
   - Replace `window.prompt` with an accessible MUI `<Dialog>` containing a controlled `<TextField autoFocus ... />` and "Cancel" / "Save" action buttons.
   - Support pressing `Enter` to submit the playlist name.
3. Check the codebase for any remaining native dialog calls:
   ```bash
   grep -rn "window\.confirm\|window\.prompt\|window\.alert" src/
   ```

## Affected Files
- `src/games/guessart/components/catalogue/CatalogueEditorDialog.tsx`
- `src/games/guessart/components/catalogue/CategoryEditorTab.tsx`
- `src/games/guessart/components/catalogue/WordEditorTab.tsx`
- `src/games/melodiq/components/SongActionDialogs.tsx`

## Acceptance Criteria & Verification
- [ ] No occurrences of `window.confirm`, `window.prompt`, or `window.alert` in the entire repository:
  ```bash
  grep -rn "window\.confirm\|window\.prompt\|window\.alert" src/
  ```
- [ ] Deletion and reset operations in GuessArt work with accessible modal confirmation.
- [ ] Playlist creation in Melodiq works with the custom prompt dialog.
- [ ] `npm run lint` completes with zero errors.
- [ ] `npm run build` completes with zero errors.
