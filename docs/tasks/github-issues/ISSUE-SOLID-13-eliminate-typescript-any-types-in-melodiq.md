---
title: "[TypeScript][Type-Safety] Eliminate any types in Melodiq game components and engines"
labels: ["typescript", "type-safety", "melodiq", "priority:medium"]
assignees: []
---

## Summary
`src/games/melodiq/` contains over 30 instances of `: any` and `<any>`.
Per `AGENTS.md` (Section 4.6), strict TypeScript must be followed and `any` must be avoided.
Replacing `any` with strongly typed domain interfaces prevents runtime errors and establishes clear component contracts.

## Problem Details & Exact Code Locations
1. `src/games/melodiq/MelodiqGame.tsx`:
   - Line 74: `profile: any`
   - Line 78: `(p: any)`
   - Line 81: `let next: any[]`
   - Line 83: `(p: any)`
   - Line 146: `realSong: any`
   - Line 198: `participants?: any[]`
   - Line 334: `usdbSong: any`
   - Line 359: `usdbSong: any`
   - Line 394: `state: any`
2. `src/games/melodiq/MelodiqTV.tsx`:
   - Line 60: `payload: any`
   - Line 64: `(prev: any)`
   - Lines 104-106, 110, 112: presentation connection API casts
3. `src/games/melodiq/PhoneClientEngine.tsx`:
   - Line 20: `sendClientCommand: (command: string, data?: any) => void`
   - Line 124: `handleMessage: (data: any) => void`
   - Line 146, 168, 183: `(p: any)`, `(r: any)`
   - Line 265: `(e: any)`
   - Line 353: `data: any`
4. `src/games/melodiq/components/HostQueueDrawer.tsx`:
   - Line 26: `activeParticipants?: any[]`
   - Line 28: `profile: any`
   - Lines 186, 312, 336, 339, 343: `(p: any)`
5. `src/games/melodiq/components/OnlineSongsView.tsx`:
   - Lines 10-16: `filteredOnlineSongs: any[]`, `songs: any[]`, `jobs: any[]`, etc.
6. `src/games/melodiq/components/PlaybackManager.tsx`:
   - Lines 18, 19, 22, 30, 203, 239

## Dependencies & Preconditions
- **Dependencies:** None. Can be implemented independently.

## Step-by-Step Implementation Instructions
1. Inspect existing types in `src/games/melodiq/types/` and declare any missing interfaces:
   ```typescript
   export interface MelodiqProfile {
     deviceId: string;
     name: string;
     hue: number;
     customName?: string;
   }

   export interface MelodiqParticipant {
     deviceId: string;
     name: string;
     hue?: number;
     role?: 'singer' | 'spectator';
   }

   export interface UsdbSongItem {
     id: number;
     artist: string;
     title: string;
     year?: number;
     language?: string;
     coverUrl?: string;
   }

   export interface MelodiqHostStateUpdate {
     songId?: string;
     status: 'idle' | 'playing' | 'paused' | 'ended';
     currentTime?: number;
     players?: Array<{ config: MelodiqProfile }>;
   }
   ```
2. Replace all `any` declarations in the listed files with their concrete interface or discriminated union.
3. For catch blocks, replace `catch (err: any)` with `catch (err: unknown)`.
4. Ensure generic components (like lists) declare proper type parameters rather than defaulting to `any[]`.

## Affected Files
- `src/games/melodiq/MelodiqGame.tsx`
- `src/games/melodiq/MelodiqTV.tsx`
- `src/games/melodiq/PhoneClientEngine.tsx`
- `src/games/melodiq/components/HostQueueDrawer.tsx`
- `src/games/melodiq/components/OnlineSongsView.tsx`
- `src/games/melodiq/components/PlaybackManager.tsx`
- `src/games/melodiq/types/` (new or extended type definitions)

## Acceptance Criteria & Verification
- [ ] No `: any` or `<any>` in the affected Melodiq files:
  ```bash
  grep -rn ": any\b\|<any>" src/games/melodiq/
  ```
- [ ] `npm run lint` completes with zero errors.
- [ ] `npm run build` completes with zero errors.
