---
title: "[Storage][DIP] Migrate Melodiq direct localStorage/sessionStorage calls to src/lib/storage.ts"
labels: ["storage", "dip", "refactoring", "melodiq", "priority:high"]
assignees: []
---

## Summary
`src/games/melodiq/` contains over 50 direct calls to `localStorage.getItem/setItem` and `sessionStorage`.
Per `AGENTS.md` (Section 4.5), all persistent storage must go through `src/lib/storage.ts` using registered constants in `STORAGE_KEYS`.
Direct raw storage calls violate the Dependency Inversion Principle (DIP), break in environments where storage is blocked (e.g. strict Safari private mode or iframing), and prevent unified storage migrations.

## Problem Details & Exact Code Locations
Files with raw storage calls in Melodiq:
1. `src/games/melodiq/hooks/usePlaylists.ts` (lines 16-18, 191)
2. `src/games/melodiq/hooks/useProfiles.ts` (lines 12-13, 17-18, 28-29, 37-38, 45-46)
3. `src/games/melodiq/hooks/useQueue.ts` (lines 71, 77, 125, 133-135, 152-153, 175, 190, 222-223, 249-250, 272, 283, 319, 342, 356)
4. `src/games/melodiq/hooks/useSongs.tsx` (lines 28, 34, 42-44, 120, 131)
5. `src/games/melodiq/hooks/useSongHistory.ts`
6. `src/games/melodiq/PhoneClientEngine.tsx` (lines 245, 249)
7. `src/games/melodiq/components/SongActionDialogs.tsx` (line 112)

## Dependencies & Preconditions
- **Dependencies:** None. Can be worked on independently.

## Step-by-Step Implementation Instructions
1. Check `src/lib/storage.ts` and add any missing Melodiq keys to `STORAGE_KEYS`:
   ```typescript
   // In STORAGE_KEYS:
   MELODIQ_P1_NAME: 'melodiq_p1_name',
   MELODIQ_P2_NAME: 'melodiq_p2_name',
   MELODIQ_P1_HUE: 'melodiq_p1_hue',
   MELODIQ_P2_HUE: 'melodiq_p2_hue',
   MELODIQ_P1_DEVICE: 'melodiq_p1_device',
   MELODIQ_P2_DEVICE: 'melodiq_p2_device',
   MELODIQ_ENABLE_PLAYLIST_SYNC: 'melodiq_enable_playlist_sync',
   MELODIQ_META_CACHE: 'melodiq_meta_cache',
   MELODIQ_RTC_CONNECTED: 'melodiq_rtc_connected',
   ```
2. Replace raw `localStorage.getItem(KEY)` with `storage.get(STORAGE_KEYS.XYZ, fallback)`.
3. Replace raw `localStorage.setItem(KEY, val)` with `storage.set(STORAGE_KEYS.XYZ, val)`.
4. Replace raw `localStorage.removeItem(KEY)` with `storage.remove(STORAGE_KEYS.XYZ)`.
5. For session-scoped items (`melodiq_meta_cache`), verify if `storage.ts` has a session mechanism or add `storage.session` methods to keep the abstraction clean.

## Affected Files
- `src/lib/storage.ts`
- `src/games/melodiq/hooks/usePlaylists.ts`
- `src/games/melodiq/hooks/useProfiles.ts`
- `src/games/melodiq/hooks/useQueue.ts`
- `src/games/melodiq/hooks/useSongs.tsx`
- `src/games/melodiq/hooks/useSongHistory.ts`
- `src/games/melodiq/PhoneClientEngine.tsx`
- `src/games/melodiq/components/SongActionDialogs.tsx`

## Acceptance Criteria & Verification
- [ ] No direct `localStorage.` or `sessionStorage.` references remain in `src/games/melodiq/`:
  ```bash
  grep -rn "localStorage\.\|sessionStorage\." src/games/melodiq/
  ```
- [ ] All keys used by Melodiq are declared in `STORAGE_KEYS` in `src/lib/storage.ts`.
- [ ] Profiles, playlist sync settings, queue, and playback states persist across page reloads.
- [ ] `npm run lint` completes with zero errors.
- [ ] `npm run build` completes with zero errors.
