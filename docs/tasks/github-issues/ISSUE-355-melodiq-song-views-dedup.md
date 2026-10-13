## Context & Problem

`jscpd` flags duplicate code clones in `OnlineSongsView.tsx` and `LocalSongsView.tsx`:

1. In `OnlineSongsView.tsx`, lines 54–66 (Card-Grid View) and lines 93–105 (List View) duplicate the exact same item click/download-dispatch logic, download status calculation, and action callbacks.
2. In `LocalSongsView.tsx`, lines 71–88 and lines 107–124 duplicate local song selection, queue action, and menu trigger logic across grid and list views.

## Branch

`refactor/melodiq-song-views-dedup`

## Target Files

- `src/games/melodiq/components/OnlineSongsView.tsx`
- `src/games/melodiq/components/LocalSongsView.tsx`
- New custom hook/helper: `src/games/melodiq/components/hooks/useSongItemActions.ts`

## Implementation Steps

1. Extract a shared hook `useSongItemActions` that handles:
   - Calculating `isDownloaded`, `isDownloading`, and `progress` for an item based on `songs` and `jobs`.
   - Handling `handleClick` (selecting downloaded song vs triggering download/queue).
   - Handling `handleActionClick` (download only).
2. Refactor `OnlineSongsView.tsx` to consume `useSongItemActions` for both `<SongCard>` and `<SongListItem>` rendering blocks.
3. Refactor `LocalSongsView.tsx` to share item callback handlers between grid and list modes.
4. Keep both components under 150 lines.

## Acceptance Criteria

- [ ] No code clones between Grid and List renderers in `OnlineSongsView.tsx` and `LocalSongsView.tsx`.
- [ ] Both components remain fully functional with `@virtuoso` virtualized scrolling.
- [ ] `npm run check:duplicates` reports zero clones for these files.
- [ ] Line counts remain comfortably below the 250-line limit.

## Verification

```bash
npm run check:duplicates
npm run check:budget
npm test
npm run lint
```
