# Tasks: PR 2 - Melodiq UX Polish, Song Sorting & Current Singer Controls [ID: TASKS-MELODIQ-UX-POLISH]

## Checklist

- [x] **Phase 1: Song Sorting on Mobile & Host (#90)**
  - [x] Add `sortOption` state and sorting logic to `src/games/melodiq/hooks/useSearchFilters.tsx`
  - [x] Add sort button / menu to `src/games/melodiq/components/MelodiqSearchBar.tsx`
  - [x] Add translation strings for sort options in `src/games/melodiq/i18n/index.ts`

- [x] **Phase 2: Header Streamlining (#86)**
  - [x] Remove `Refresh` button from `src/games/melodiq/hooks/useMelodiqHeader.tsx`

- [x] **Phase 3: Requester Name on Now Playing (#91)**
  - [x] Display requester name in `src/games/melodiq/components/HostQueueDrawer.tsx` nowPlaying card

- [x] **Phase 4: Live Participant & Mic Re-assignment (#85)**
  - [x] Enhance reactive update in `src/games/melodiq/gameplay/hooks/useSessionPlayers.ts` to support live mic re-assignments

- [x] **Phase 5: Verification & Documentation**
  - [x] Run `npm run lint` and `npm run build`
  - [x] Create walkthrough in `docs/verification/melodiq-ux-sorting-polish-walkthrough.md`
