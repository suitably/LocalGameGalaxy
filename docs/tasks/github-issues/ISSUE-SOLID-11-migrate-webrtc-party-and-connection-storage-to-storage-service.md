---
title: "[Storage][DIP] Migrate WebRTC, Party, Connection, and Push storage calls to src/lib/storage.ts"
labels: ["storage", "dip", "refactoring", "webrtc", "party", "priority:high"]
assignees: []
---

## Summary
Direct `localStorage` and `sessionStorage` accesses bypass `src/lib/storage.ts` in shared infrastructure files: WebRTC host context, universal party manager, device connection components, and push relay storage.
Centralizing these into `storage.ts` ensures safe in-memory fallback, predictable keys, and unified cleanup.

## Problem Details & Exact Code Locations
1. `src/lib/webrtc/WebRTCHostContext.tsx` (lines 66, 71, 77, 94, 96, 136, 142, 146, 150, 155, 292, 293, 311)
   Keys: `${gameId}_party_id`, `${gameId}_tracker_urls`, `${gameId}_tracker_preferences`, `${gameId}_active_peer_ids`, etc.
2. `src/features/party/logic/universalPartyManager.ts` (lines 52, 53, 63, 72, 75, 83, 93, 99, 151, 155, 313, 359, 365)
   Keys: `party_my_player_id`, `galaxy_host_room_code`, `galaxy_party_state_${roomId}`, `party_host_id_${roomId}`
3. `src/components/connection/DeviceConnection.tsx` (lines 89, 111, 112, 115, 133)
   Keys: `${gameId}_host_base_url`, `${gameId}_enable_helper`, etc.
4. `src/components/connection/ServerAdminPanel.tsx` (lines 68, 72)
   Key: `nexumia_share_webapp_url`
5. `src/modules/drawing/ExcalidrawLazy.tsx` (lines 19, 30)
   Key: `excalidraw`
6. `src/lib/push/gameRelayStorage.ts` (lines 31, 33, 50, 59, 65, 68, 106, 118-123, 136)
   Prefix: `${STORAGE_PREFIX}${gameId}`
7. `src/i18n.ts` (lines 7, 38, 39)
   Keys: `lgg_language`, `language`
8. `src/games/werewolf/components/GameSetup.tsx` (lines 36, 46, 59)
   Key: `STORAGE_KEY_SETTINGS`
9. `src/components/pwa/PWAInstallBanner.tsx` (lines 13, 26)
   Key: `pwa-banner-dismissed`

## Dependencies & Preconditions
- **Dependencies:** None.

## Step-by-Step Implementation Instructions
1. In `src/lib/storage.ts`:
   - Add prefix builders / constant helpers for game-specific keys:
     ```typescript
     export const STORAGE_PREFIXES = {
       PARTY_STATE: 'galaxy_party_state_',
       WEBRTC_PARTY_ID: '_party_id',
       WEBRTC_TRACKER_URLS: '_tracker_urls',
       WEBRTC_TRACKER_PREF: '_tracker_preferences',
       WEBRTC_ACTIVE_PEERS: '_active_peer_ids',
       HOST_BASE_URL: '_host_base_url',
     } as const;
     ```
   - Register static keys:
     ```typescript
     PARTY_MY_PLAYER_ID: 'party_my_player_id',
     HOST_ROOM_CODE: 'galaxy_host_room_code',
     SHARE_WEBAPP_URL: 'nexumia_share_webapp_url',
     PWA_BANNER_DISMISSED: 'pwa-banner-dismissed',
     LANGUAGE: 'lgg_language',
     ```
2. Refactor `WebRTCHostContext.tsx` to read and write through `storage.get/set/remove`.
3. Refactor `universalPartyManager.ts` to read and write through `storage.get/set/remove`.
4. Refactor `DeviceConnection.tsx` and `ServerAdminPanel.tsx`.
5. Refactor `ExcalidrawLazy.tsx`.
6. Refactor `gameRelayStorage.ts` – add a helper `storage.findKeysWithPrefix(prefix)` in `storage.ts` to replace the raw `for (let i = 0; i < localStorage.length; i++)` loop cleanly.
7. Refactor `i18n.ts`, `GameSetup.tsx` (Werewolf), and `PWAInstallBanner.tsx`.

## Affected Files
- `src/lib/storage.ts`
- `src/lib/webrtc/WebRTCHostContext.tsx`
- `src/features/party/logic/universalPartyManager.ts`
- `src/components/connection/DeviceConnection.tsx`
- `src/components/connection/ServerAdminPanel.tsx`
- `src/modules/drawing/ExcalidrawLazy.tsx`
- `src/lib/push/gameRelayStorage.ts`
- `src/i18n.ts`
- `src/games/werewolf/components/GameSetup.tsx`
- `src/components/pwa/PWAInstallBanner.tsx`

## Acceptance Criteria & Verification
- [ ] No raw `localStorage.` or `sessionStorage.` in the modified files.
- [ ] Verification command:
  ```bash
  grep -rn "localStorage\.\|sessionStorage\." src/lib/webrtc/ src/features/party/ src/components/connection/ src/modules/drawing/ src/lib/push/
  ```
- [ ] WebRTC connection negotiation, room creation, and push subscription storage remain fully functional.
- [ ] `npm run lint` completes with zero errors.
- [ ] `npm run build` completes with zero errors.
